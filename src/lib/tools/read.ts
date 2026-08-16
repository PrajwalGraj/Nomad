import { decodeEventLog, decodeFunctionData, formatEther, formatUnits, getAddress, toFunctionSelector, type Address } from "viem";
import { publicClient } from "@/lib/viem";
import { erc20Abi } from "@/lib/contracts/erc20";
import { nomadTokenFactoryAbi, FACTORY_ADDRESS } from "@/lib/contracts/factory";
import { KNOWN_TOKENS } from "@/lib/tokens";
import type {
  ActivityEntry,
  DecodedEvent,
  ExplainTransactionCard,
  TokenInfoCard,
  TxHistoryCard,
  WalletOverviewCard,
} from "./types";

export async function getWalletOverview(address: Address): Promise<WalletOverviewCard> {
  const [nativeBalance, txCount] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.getTransactionCount({ address }),
  ]);

  let tokens: WalletOverviewCard["tokens"] = [];
  if (KNOWN_TOKENS.length > 0) {
    const results = await publicClient.multicall({
      contracts: KNOWN_TOKENS.flatMap((t) => [
        { address: t.address, abi: erc20Abi, functionName: "balanceOf", args: [address] } as const,
        { address: t.address, abi: erc20Abi, functionName: "decimals" } as const,
      ]),
      allowFailure: true,
    });

    tokens = KNOWN_TOKENS.map((t, i) => {
      const balanceResult = results[i * 2];
      const decimalsResult = results[i * 2 + 1];
      if (balanceResult.status !== "success" || decimalsResult.status !== "success") {
        return { symbol: t.symbol, address: t.address, balanceFormatted: "unavailable" };
      }
      return {
        symbol: t.symbol,
        address: t.address,
        balanceFormatted: formatUnits(balanceResult.result as bigint, decimalsResult.result as number),
      };
    });
  }

  return {
    kind: "wallet_overview",
    address,
    nativeBalanceFormatted: formatEther(nativeBalance),
    tokens,
    txCount,
  };
}

export async function getTokenInfo(tokenAddress: Address): Promise<TokenInfoCard> {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "name" }),
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "symbol" }),
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
    publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "totalSupply" }),
  ]);

  return {
    kind: "token_info",
    address: tokenAddress,
    name,
    symbol,
    decimals,
    totalSupplyFormatted: formatUnits(totalSupply, decimals),
    priceNote:
      "No live price feed is wired up for Monad testnet tokens — pricing would need a DEX pool reserve lookup or a price API once one exists for this ecosystem.",
  };
}

// Monad's own explorer (Monadscan) is Etherscan-compatible and served through
// Etherscan's unified multichain API — one key works across chains, keyed by chainid.
const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";
const MONAD_TESTNET_CHAIN_ID = 10143;

const TRANSFER_SELECTOR = toFunctionSelector("transfer(address,uint256)");
const APPROVE_SELECTOR = toFunctionSelector("approve(address,uint256)");
const LAUNCH_TOKEN_SELECTOR = toFunctionSelector("launchToken(string,string,uint256)");

type EtherscanTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  isError: string;
  txreceipt_status: string;
  timeStamp: string;
  contractAddress: string;
  functionName: string;
};

export async function getTransactionHistory(address: Address, limit: number): Promise<TxHistoryCard> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return {
      kind: "tx_history",
      address,
      activity: [],
      note: "ETHERSCAN_API_KEY isn't set — recent activity is powered by Monadscan's Etherscan-compatible API. Get a free key at etherscan.io and add it to .env.local.",
    };
  }

  const url = new URL(ETHERSCAN_API_BASE);
  url.searchParams.set("chainid", String(MONAD_TESTNET_CHAIN_ID));
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", String(limit));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Monadscan request failed (${res.status}).`);
  const body = (await res.json()) as { status: string; message: string; result: EtherscanTx[] | string };

  if (body.status !== "1") {
    // Monadscan returns status "0" for a clean "no activity yet" address too, not just errors.
    if (body.message === "No transactions found") {
      return { kind: "tx_history", address, activity: [], note: "No transactions found for this address yet." };
    }
    throw new Error(`Monadscan error: ${typeof body.result === "string" ? body.result : body.message}`);
  }

  const txs = body.result as EtherscanTx[];

  // Batch-fetch symbol/decimals for every contract a transfer/approve call targets,
  // so summaries can say "Sent 5 NOMAD" instead of leaving a raw token address in.
  const tokenTargets = [
    ...new Set(
      txs
        .filter((tx) => [TRANSFER_SELECTOR, APPROVE_SELECTOR].includes(tx.input.slice(0, 10) as `0x${string}`))
        .map((tx) => getAddress(tx.to))
    ),
  ];
  const tokenMetaResults = tokenTargets.length
    ? await publicClient.multicall({
        contracts: tokenTargets.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: "symbol" } as const,
          { address: addr, abi: erc20Abi, functionName: "decimals" } as const,
        ]),
        allowFailure: true,
      })
    : [];
  const tokenMeta = new Map<string, { symbol: string; decimals: number }>();
  tokenTargets.forEach((addr, i) => {
    const symbolResult = tokenMetaResults[i * 2];
    const decimalsResult = tokenMetaResults[i * 2 + 1];
    tokenMeta.set(addr.toLowerCase(), {
      symbol: symbolResult?.status === "success" ? (symbolResult.result as string) : "tokens",
      decimals: decimalsResult?.status === "success" ? (decimalsResult.result as number) : 18,
    });
  });

  const activity: ActivityEntry[] = txs.map((tx) => summarizeActivity(tx, address, tokenMeta));

  return {
    kind: "tx_history",
    address,
    activity,
    note: `Last ${activity.length} transaction(s) from Monadscan, most recent first.`,
  };
}

function summarizeActivity(
  tx: EtherscanTx,
  address: Address,
  tokenMeta: Map<string, { symbol: string; decimals: number }>
): ActivityEntry {
  const isCreation = tx.to === "";
  const to = isCreation ? getAddress(tx.contractAddress) : getAddress(tx.to);
  const from = getAddress(tx.from);
  const direction: ActivityEntry["direction"] =
    from.toLowerCase() === address.toLowerCase() ? "out" : to.toLowerCase() === address.toLowerCase() ? "in" : "self";
  const status: ActivityEntry["status"] = tx.isError === "1" || tx.txreceipt_status === "0" ? "failed" : "success";
  const methodId = tx.input.slice(0, 10);

  let summary: string;
  if (isCreation) {
    summary = "Deployed a contract";
  } else if (methodId === LAUNCH_TOKEN_SELECTOR && FACTORY_ADDRESS && to.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
    try {
      const { args } = decodeFunctionData({ abi: nomadTokenFactoryAbi, data: tx.input as `0x${string}` });
      summary = `Launched token "${args[0]}"`;
    } catch {
      summary = "Launched a token";
    }
  } else if (methodId === TRANSFER_SELECTOR) {
    const meta = tokenMeta.get(to.toLowerCase()) ?? { symbol: "tokens", decimals: 18 };
    try {
      const { args } = decodeFunctionData({ abi: erc20Abi, data: tx.input as `0x${string}` });
      const [, amount] = args as [Address, bigint];
      summary = `Sent ${formatUnits(amount, meta.decimals)} ${meta.symbol}`;
    } catch {
      summary = `Sent ${meta.symbol}`;
    }
  } else if (methodId === APPROVE_SELECTOR) {
    const meta = tokenMeta.get(to.toLowerCase()) ?? { symbol: "tokens", decimals: 18 };
    summary = `Approved ${meta.symbol} for spending`;
  } else if (tx.input === "0x") {
    const valueFormatted = formatEther(BigInt(tx.value));
    summary = direction === "out" ? `Sent ${valueFormatted} MON` : `Received ${valueFormatted} MON`;
  } else if (tx.functionName) {
    summary = tx.functionName.split("(")[0];
  } else {
    summary = "Contract interaction";
  }

  return {
    txHash: tx.hash as `0x${string}`,
    timestamp: tx.timeStamp,
    status,
    direction,
    counterparty: direction === "out" ? to : from,
    summary,
  };
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type RawTransfer = { tokenAddress: Address; from: Address; to: Address; value: bigint };

function parseTransferLog(log: { address: Address; topics: readonly `0x${string}`[]; data: `0x${string}` }): RawTransfer | null {
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  // ERC-20's Transfer(address,address,uint256) and ERC-721's Transfer(address,address,uint256)
  // share this exact topic0 hash — only the ERC-20 one has `value` non-indexed (in data,
  // topics.length === 3). ERC-721 indexes tokenId too (topics.length === 4, data empty).
  // Without this check an NFT transfer gets silently mis-decoded as a token value of ~0.
  if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length !== 3 || log.data === "0x") return null;
  return {
    tokenAddress: log.address,
    from: getAddress(`0x${log.topics[1].slice(26)}`),
    to: getAddress(`0x${log.topics[2].slice(26)}`),
    value: BigInt(log.data),
  };
}

export async function explainTransaction(txHash: `0x${string}`): Promise<ExplainTransactionCard> {
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: txHash }),
    publicClient.getTransactionReceipt({ hash: txHash }),
  ]);

  const transfers = receipt.logs.map(parseTransferLog).filter((t): t is RawTransfer => t !== null);

  const uniqueTokens = [...new Set(transfers.map((t) => t.tokenAddress))];
  const tokenMetaResults = uniqueTokens.length
    ? await publicClient.multicall({
        contracts: uniqueTokens.flatMap((addr) => [
          { address: addr, abi: erc20Abi, functionName: "symbol" } as const,
          { address: addr, abi: erc20Abi, functionName: "decimals" } as const,
        ]),
        allowFailure: true,
      })
    : [];
  const tokenMeta = new Map<string, { symbol: string; decimals: number }>();
  uniqueTokens.forEach((addr, i) => {
    const symbolResult = tokenMetaResults[i * 2];
    const decimalsResult = tokenMetaResults[i * 2 + 1];
    tokenMeta.set(addr.toLowerCase(), {
      symbol: symbolResult?.status === "success" ? (symbolResult.result as string) : "tokens",
      decimals: decimalsResult?.status === "success" ? (decimalsResult.result as number) : 18,
    });
  });

  const decodedEvents: DecodedEvent[] = transfers.map((t) => {
    const meta = tokenMeta.get(t.tokenAddress.toLowerCase()) ?? { symbol: "tokens", decimals: 18 };
    return {
      name: "Transfer",
      summary: `${formatUnits(t.value, meta.decimals)} ${meta.symbol}: ${short(t.from)} → ${short(t.to)}`,
    };
  });

  const status: ExplainTransactionCard["status"] = receipt.status === "success" ? "success" : "reverted";
  const details =
    status === "reverted"
      ? { summary: "Transaction reverted", icon: undefined, detailType: "reverted" as const }
      : await summarizeTransaction(tx, transfers, tokenMeta);

  let launchedTokenAddress: `0x${string}` | undefined;
  if (details.detailType === "launch") {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: nomadTokenFactoryAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "TokenLaunched") {
          launchedTokenAddress = decoded.args.token;
          break;
        }
      } catch {
        // Not a TokenLaunched log — skip.
      }
    }
  }

  return {
    kind: "explain_transaction",
    hash: txHash,
    status,
    summary: details.summary,
    icon: details.icon,
    detailType: details.detailType,
    launchedTokenAddress,
    from: tx.from,
    to: tx.to,
    valueFormatted: formatEther(tx.value),
    gasUsed: receipt.gasUsed.toString(),
    decodedEvents,
  };
}

type TransactionDetails = {
  summary: string;
  icon?: ExplainTransactionCard["icon"];
  detailType: ExplainTransactionCard["detailType"];
};

async function summarizeTransaction(
  tx: { from: Address; to: Address | null; input: `0x${string}`; value: bigint },
  transfers: RawTransfer[],
  tokenMeta: Map<string, { symbol: string; decimals: number }>
): Promise<TransactionDetails> {
  const fromLower = tx.from.toLowerCase();
  const outgoing = transfers.filter((t) => t.from.toLowerCase() === fromLower);
  const incoming = transfers.filter((t) => t.to.toLowerCase() === fromLower);
  const methodId = tx.input.slice(0, 10);

  if (transfers.length === 0 && tx.input === "0x" && tx.to) {
    return {
      summary: `Sent ${formatEther(tx.value)} MON to ${short(tx.to)}`,
      icon: { kind: "single", symbol: "MON" },
      detailType: "native_transfer",
    };
  }
  if (!tx.to) {
    return { summary: "Deployed a contract", detailType: "deploy" };
  }
  if (outgoing.length === 1 && incoming.length === 1 && outgoing[0].tokenAddress.toLowerCase() !== incoming[0].tokenAddress.toLowerCase()) {
    const sold = tokenMeta.get(outgoing[0].tokenAddress.toLowerCase())!;
    const bought = tokenMeta.get(incoming[0].tokenAddress.toLowerCase())!;
    return {
      summary: `Swapped ${formatUnits(outgoing[0].value, sold.decimals)} ${sold.symbol} for ${formatUnits(incoming[0].value, bought.decimals)} ${bought.symbol}`,
      icon: { kind: "swap", tokenInSymbol: sold.symbol, tokenOutSymbol: bought.symbol },
      detailType: "swap",
    };
  }
  // Native MON legs of a swap never emit a Transfer log, so a MON-in/token-out swap only
  // shows up as one incoming ERC-20 transfer alongside the tx's own native value — the
  // reverse (token-in/MON-out) is invisible to log scanning and falls through below.
  if (tx.value > 0n && outgoing.length === 0 && incoming.length === 1) {
    const bought = tokenMeta.get(incoming[0].tokenAddress.toLowerCase())!;
    return {
      summary: `Swapped ${formatEther(tx.value)} MON for ${formatUnits(incoming[0].value, bought.decimals)} ${bought.symbol}`,
      icon: { kind: "swap", tokenInSymbol: "MON", tokenOutSymbol: bought.symbol },
      detailType: "swap",
    };
  }
  if (methodId === LAUNCH_TOKEN_SELECTOR && FACTORY_ADDRESS && tx.to.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
    try {
      const { args } = decodeFunctionData({ abi: nomadTokenFactoryAbi, data: tx.input });
      return {
        summary: `Launched token "${args[0]}"`,
        icon: { kind: "single", symbol: args[1] as string },
        detailType: "launch",
      };
    } catch {
      return { summary: "Launched a token", detailType: "launch" };
    }
  }
  if (outgoing.length === 1) {
    const meta = tokenMeta.get(outgoing[0].tokenAddress.toLowerCase())!;
    return {
      summary: `Sent ${formatUnits(outgoing[0].value, meta.decimals)} ${meta.symbol} to ${short(outgoing[0].to)}`,
      icon: { kind: "single", symbol: meta.symbol },
      detailType: "token_transfer",
    };
  }
  if (incoming.length === 1) {
    const meta = tokenMeta.get(incoming[0].tokenAddress.toLowerCase())!;
    return {
      summary: `Received ${formatUnits(incoming[0].value, meta.decimals)} ${meta.symbol} from ${short(incoming[0].from)}`,
      icon: { kind: "single", symbol: meta.symbol },
      detailType: "token_transfer",
    };
  }
  if (methodId === APPROVE_SELECTOR) {
    try {
      const symbol = await publicClient.readContract({ address: tx.to, abi: erc20Abi, functionName: "symbol" });
      return { summary: `Approved ${symbol} for spending`, icon: { kind: "single", symbol }, detailType: "approve" };
    } catch {
      return { summary: "Approved a token for spending", detailType: "approve" };
    }
  }
  if (transfers.length > 2) {
    return { summary: `Contract interaction (${transfers.length} token transfers)`, detailType: "contract" };
  }
  return { summary: "Contract interaction", detailType: "contract" };
}
