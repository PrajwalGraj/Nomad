import { formatEther, formatUnits, parseAbiItem, type Address } from "viem";
import { publicClient } from "@/lib/viem";
import { erc20Abi } from "@/lib/contracts/erc20";
import { KNOWN_TOKENS } from "@/lib/tokens";
import type {
  DecodedEvent,
  ExplainTransactionCard,
  TokenInfoCard,
  TransferEntry,
  TxHistoryCard,
  WalletOverviewCard,
} from "./types";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Total block window scanned (in chunks — see getTransactionHistory) without an indexer.
const LOG_SCAN_BLOCK_WINDOW = BigInt(process.env.NOMAD_LOG_SCAN_BLOCKS ?? 5000);
// Unfiltered (no contract address) eth_getLogs queries on this RPC were observed
// to hang indefinitely past ~200-500 blocks in one request — chunking keeps each
// request well under that so a timeout (see lib/viem.ts) can catch it instead of hanging.
const LOG_SCAN_CHUNK_SIZE = 100n;

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

export async function getTransactionHistory(address: Address, limit: number): Promise<TxHistoryCard> {
  const latestBlock = await publicClient.getBlockNumber();
  const windowStart = latestBlock > LOG_SCAN_BLOCK_WINDOW ? latestBlock - LOG_SCAN_BLOCK_WINDOW : 0n;

  const logs: {
    address: Address;
    blockNumber: bigint | null;
    transactionHash: `0x${string}` | null;
    args: { from?: Address; to?: Address; value?: bigint };
  }[] = [];
  let chunkEnd = latestBlock;
  let chunksWithErrors = 0;
  let blocksScanned = 0n;

  while (chunkEnd >= windowStart && logs.length < limit) {
    const chunkStart = chunkEnd - LOG_SCAN_CHUNK_SIZE + 1n > windowStart ? chunkEnd - LOG_SCAN_CHUNK_SIZE + 1n : windowStart;
    try {
      const [outgoing, incoming] = await Promise.all([
        publicClient.getLogs({ event: transferEvent, args: { from: address }, fromBlock: chunkStart, toBlock: chunkEnd }),
        publicClient.getLogs({ event: transferEvent, args: { to: address }, fromBlock: chunkStart, toBlock: chunkEnd }),
      ]);
      // ERC-721's Transfer(address,address,uint256) shares ERC-20's topic0 hash but
      // indexes tokenId as a 3rd topic instead of putting value in data — viem still
      // matches it against our event ABI and leaves args.value as undefined rather
      // than erroring. Drop those before anything downstream calls formatUnits on it.
      const isErc20Shaped = (l: (typeof outgoing)[number]) => l.topics.length === 3 && l.args.value !== undefined;
      logs.push(...outgoing.filter(isErc20Shaped), ...incoming.filter(isErc20Shaped));
    } catch {
      chunksWithErrors++;
    }
    blocksScanned += chunkEnd - chunkStart + 1n;
    chunkEnd = chunkStart - 1n;
  }

  if (logs.length === 0 && chunksWithErrors > 0) {
    return {
      kind: "tx_history",
      address,
      transfers: [],
      note: `This RPC rejected or timed out on every chunk of a log scan over the last ${blocksScanned} blocks. Full transaction history needs an indexer (Envio/Goldsky) — none is wired up yet.`,
    };
  }

  logs.sort((a, b) => (b.blockNumber ?? 0n) > (a.blockNumber ?? 0n) ? 1 : -1);
  const trimmed = logs.slice(0, limit);

  const uniqueTokens = [...new Set(trimmed.map((l) => l.address))];
  const metaResults = await publicClient.multicall({
    contracts: uniqueTokens.flatMap((addr) => [
      { address: addr, abi: erc20Abi, functionName: "symbol" } as const,
      { address: addr, abi: erc20Abi, functionName: "decimals" } as const,
    ]),
    allowFailure: true,
  });
  const tokenMeta = new Map<string, { symbol: string; decimals: number }>();
  uniqueTokens.forEach((addr, i) => {
    const symbolResult = metaResults[i * 2];
    const decimalsResult = metaResults[i * 2 + 1];
    tokenMeta.set(addr, {
      symbol: symbolResult.status === "success" ? (symbolResult.result as string) : "???",
      decimals: decimalsResult.status === "success" ? (decimalsResult.result as number) : 18,
    });
  });

  const transfers: TransferEntry[] = trimmed.map((log) => {
    const meta = tokenMeta.get(log.address) ?? { symbol: "???", decimals: 18 };
    const from = log.args.from as Address;
    const to = log.args.to as Address;
    return {
      txHash: log.transactionHash!,
      blockNumber: (log.blockNumber ?? 0n).toString(),
      tokenSymbol: meta.symbol,
      tokenAddress: log.address,
      from,
      to,
      amountFormatted: formatUnits(log.args.value as bigint, meta.decimals),
      direction: from.toLowerCase() === address.toLowerCase() ? "out" : "in",
    };
  });

  return {
    kind: "tx_history",
    address,
    transfers,
    note: `Scanned ERC-20 Transfer logs over the last ${blocksScanned} blocks${chunksWithErrors > 0 ? ` (${chunksWithErrors} chunk(s) failed and were skipped)` : ""}. Native MON sends don't emit logs, so they won't appear here — that needs an indexer.`,
  };
}

export async function explainTransaction(txHash: `0x${string}`): Promise<ExplainTransactionCard> {
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: txHash }),
    publicClient.getTransactionReceipt({ hash: txHash }),
  ]);

  const decodedEvents: DecodedEvent[] = [];
  for (const log of receipt.logs) {
    try {
      const decoded = parseTransferLog(log);
      if (decoded) decodedEvents.push(decoded);
    } catch {
      // Not a recognized event — skip. We only decode against known ABIs (ERC-20 Transfer for now).
    }
  }

  return {
    kind: "explain_transaction",
    hash: txHash,
    status: receipt.status === "success" ? "success" : "reverted",
    from: tx.from,
    to: tx.to,
    valueFormatted: formatEther(tx.value),
    gasUsed: receipt.gasUsed.toString(),
    decodedEvents,
  };
}

function parseTransferLog(log: { address: Address; topics: readonly `0x${string}`[]; data: `0x${string}` }): DecodedEvent | null {
  const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  // ERC-20's Transfer(address,address,uint256) and ERC-721's Transfer(address,address,uint256)
  // share this exact topic0 hash — only the ERC-20 one has `value` non-indexed (in data,
  // topics.length === 3). ERC-721 indexes tokenId too (topics.length === 4, data empty).
  // Without this check an NFT transfer gets silently mis-decoded as a token value of ~0.
  if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length !== 3 || log.data === "0x") return null;
  const from = `0x${log.topics[1].slice(26)}`;
  const to = `0x${log.topics[2].slice(26)}`;
  const value = BigInt(log.data);
  return {
    name: "Transfer",
    summary: `Transfer of raw amount ${value.toString()} on token ${log.address} from ${from} to ${to}`,
  };
}
