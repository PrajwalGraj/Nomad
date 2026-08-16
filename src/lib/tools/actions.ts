import { encodeFunctionData, formatEther, formatUnits, getAddress, isAddress, parseEther, parseUnits, toHex, type Address } from "viem";
import { publicClient } from "@/lib/viem";
import { erc20Abi } from "@/lib/contracts/erc20";
import { FACTORY_ADDRESS, nomadTokenFactoryAbi } from "@/lib/contracts/factory";
import { getKuruQuote, NATIVE_MON_SENTINEL } from "@/lib/kuru";
import { KNOWN_TOKENS } from "@/lib/tokens";
import type { PrepareLaunchCard, PrepareSendCard, PrepareSwapCard } from "./types";

// Monad charges gas_limit * price_per_gas — the limit, not what's actually consumed
// (block leaders build blocks before execution, so usage isn't known at inclusion
// time). So the cost shown to users has to be the limit times the live gas price,
// never the raw gas-unit number on its own.
const FALLBACK_GAS_PRICE_WEI = 100_000_000_000n; // Monad's stated minimum base fee: 100 gwei

async function estimateGasCostMon(gasLimit: bigint) {
  const gasPrice = await publicClient.getGasPrice().catch(() => FALLBACK_GAS_PRICE_WEI);
  return `${formatEther(gasLimit * gasPrice)} MON`;
}

function resolveKnownToken(symbol: string) {
  const token = KNOWN_TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
  if (!token) {
    throw new Error(
      `Unknown token symbol "${symbol}". Known tokens: ${KNOWN_TOKENS.map((t) => t.symbol).join(", ") || "(none configured)"}.`
    );
  }
  return token;
}

export async function prepareSend(
  input: { to: string; amount: string; tokenSymbol?: string },
  ctx: { walletAddress: Address }
): Promise<PrepareSendCard> {
  const { amount } = input;
  const tokenSymbol = input.tokenSymbol?.trim() || "MON";

  if (!isAddress(input.to)) {
    throw new Error(`"${input.to}" is not a valid address. Only raw 0x addresses are supported — no ENS-style resolution on Monad testnet.`);
  }
  // Monad's RPC rejects mismatched-checksum addresses outright (-32602) rather
  // than accepting them like many nodes do — normalize before any RPC call.
  const to = getAddress(input.to);

  const isNative = tokenSymbol.toUpperCase() === "MON";

  if (isNative) {
    const amountWei = parseEther(amount);
    const balance = await publicClient.getBalance({ address: ctx.walletAddress });
    const estimatedGas = await publicClient
      .estimateGas({ account: ctx.walletAddress, to, value: amountWei })
      .catch(() => 21000n);

    return {
      kind: "prepare_send",
      to,
      amountFormatted: amount,
      token: { symbol: "MON", address: "native", decimals: 18 },
      tx: { to, value: toHex(amountWei), data: "0x" },
      estimatedGasFormatted: await estimateGasCostMon(estimatedGas),
      insufficientBalance: balance < amountWei,
    };
  }

  const token = resolveKnownToken(tokenSymbol);
  const decimals = await publicClient.readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "decimals",
  });
  const amountUnits = parseUnits(amount, decimals);
  const balance = await publicClient.readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [ctx.walletAddress],
  });
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amountUnits] });
  const estimatedGas = await publicClient
    .estimateGas({ account: ctx.walletAddress, to: token.address, data })
    .catch(() => 65000n);

  return {
    kind: "prepare_send",
    to,
    amountFormatted: amount,
    token: { symbol: token.symbol, address: token.address, decimals },
    tx: { to: token.address, value: "0x0", data },
    estimatedGasFormatted: await estimateGasCostMon(estimatedGas),
    insufficientBalance: balance < amountUnits,
  };
}

export async function prepareSwap(
  input: { tokenInSymbol: string; tokenOutSymbol: string; amountIn: string; slippageBps?: number },
  ctx: { walletAddress: Address }
): Promise<PrepareSwapCard> {
  const slippageBps = input.slippageBps ?? 100;
  const tokenInInfo = { symbol: input.tokenInSymbol, address: resolveSwapToken(input.tokenInSymbol) };
  const tokenOutInfo = { symbol: input.tokenOutSymbol, address: resolveSwapToken(input.tokenOutSymbol) };

  const baseCard: PrepareSwapCard = {
    kind: "prepare_swap",
    configured: false,
    tokenIn: tokenInInfo,
    tokenOut: tokenOutInfo,
    amountInFormatted: input.amountIn,
    slippageBps,
  };

  const decimalsIn = tokenInInfo.address === "native" ? 18 : await readDecimals(tokenInInfo.address);
  const amountInUnits = parseUnits(input.amountIn, decimalsIn);

  const kuruTokenIn = tokenInInfo.address === "native" ? NATIVE_MON_SENTINEL : tokenInInfo.address;
  const kuruTokenOut = tokenOutInfo.address === "native" ? NATIVE_MON_SENTINEL : tokenOutInfo.address;

  let quote;
  try {
    quote = await getKuruQuote({
      userAddress: ctx.walletAddress,
      tokenIn: kuruTokenIn,
      tokenOut: kuruTokenOut,
      amountUnits: amountInUnits.toString(),
      slippageBps,
    });
  } catch (err) {
    return {
      ...baseCard,
      reason: `Kuru Flow request failed: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }

  if (quote.status !== "success" || !quote.transaction) {
    return {
      ...baseCard,
      reason: quote.message ?? "Kuru Flow couldn't find a route for this pair — try a different amount or pair.",
    };
  }

  // ERC-20 sell-side needs an on-chain allowance for Kuru's router before the
  // swap itself can be signed. Surface the approve() call as its own step —
  // ask the agent to call prepare_swap again once it confirms.
  if (tokenInInfo.address !== "native") {
    const spender = getAddress(quote.transaction.to);
    const allowance = await publicClient.readContract({
      address: tokenInInfo.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ctx.walletAddress, spender],
    });
    if (allowance < amountInUnits) {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amountInUnits],
      });
      return {
        ...baseCard,
        configured: true,
        step: "approve",
        tx: { to: tokenInInfo.address, value: "0x0", data },
      };
    }
  }

  const decimalsOut = tokenOutInfo.address === "native" ? 18 : await readDecimals(tokenOutInfo.address);
  const calldata = quote.transaction.calldata.startsWith("0x")
    ? (quote.transaction.calldata as `0x${string}`)
    : (`0x${quote.transaction.calldata}` as `0x${string}`);

  return {
    ...baseCard,
    configured: true,
    step: "swap",
    expectedAmountOutFormatted: formatUnits(BigInt(quote.output), decimalsOut),
    minAmountOutFormatted: formatUnits(BigInt(quote.minOut), decimalsOut),
    tx: {
      to: getAddress(quote.transaction.to),
      value: toHex(BigInt(quote.transaction.value || "0")),
      data: calldata,
    },
  };
}

function resolveSwapToken(symbol: string): Address | "native" {
  if (symbol.toUpperCase() === "MON") return "native";
  return resolveKnownToken(symbol).address;
}

async function readDecimals(address: Address) {
  return publicClient.readContract({ address, abi: erc20Abi, functionName: "decimals" });
}

export async function prepareTokenLaunch(
  input: { name: string; symbol: string; totalSupply: string },
  ctx: { walletAddress: Address }
): Promise<PrepareLaunchCard> {
  const baseCard: PrepareLaunchCard = {
    kind: "prepare_token_launch",
    configured: false,
    name: input.name,
    symbol: input.symbol,
    totalSupplyFormatted: input.totalSupply,
  };

  if (!FACTORY_ADDRESS) {
    return {
      ...baseCard,
      reason:
        "Nomad's token factory isn't deployed yet (NOMAD_FACTORY_ADDRESS unset). Run contracts/script/DeployFactory.s.sol against Monad testnet and set the env var.",
    };
  }

  const totalSupplyUnits = parseUnits(input.totalSupply, 18);
  const data = encodeFunctionData({
    abi: nomadTokenFactoryAbi,
    functionName: "launchToken",
    args: [input.name, input.symbol, totalSupplyUnits],
  });
  const estimatedGas = await publicClient
    .estimateGas({ account: ctx.walletAddress, to: FACTORY_ADDRESS, data })
    .catch(() => 1_500_000n);

  return {
    ...baseCard,
    configured: true,
    tx: { to: FACTORY_ADDRESS, value: "0x0", data },
    estimatedGasFormatted: await estimateGasCostMon(estimatedGas),
  };
}
