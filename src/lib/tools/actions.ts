import { encodeFunctionData, formatUnits, getAddress, isAddress, parseEther, parseUnits, toHex, type Address } from "viem";
import { publicClient } from "@/lib/viem";
import { erc20Abi } from "@/lib/contracts/erc20";
import { FACTORY_ADDRESS, nomadTokenFactoryAbi } from "@/lib/contracts/factory";
import { DEX_ROUTER_ADDRESS, WRAPPED_NATIVE_ADDRESS, routerAbi } from "@/lib/contracts/router";
import { KNOWN_TOKENS } from "@/lib/tokens";
import type { PrepareLaunchCard, PrepareSendCard, PrepareSwapCard } from "./types";

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
      estimatedGas: estimatedGas.toString(),
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
    estimatedGas: estimatedGas.toString(),
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

  if (!DEX_ROUTER_ADDRESS) {
    return {
      ...baseCard,
      reason:
        "No DEX router is configured yet (DEX_ROUTER_ADDRESS unset). The build brief flagged that Monad testnet DEX liquidity needs to be verified before wiring this up — set the env var once a router is confirmed.",
    };
  }
  if ((tokenInInfo.address === "native" || tokenOutInfo.address === "native") && !WRAPPED_NATIVE_ADDRESS) {
    return {
      ...baseCard,
      reason: "Native MON swaps need WRAPPED_NATIVE_ADDRESS (WMON) configured to route through the DEX.",
    };
  }

  const pathIn = tokenInInfo.address === "native" ? WRAPPED_NATIVE_ADDRESS! : tokenInInfo.address;
  const pathOut = tokenOutInfo.address === "native" ? WRAPPED_NATIVE_ADDRESS! : tokenOutInfo.address;

  const decimalsIn = tokenInInfo.address === "native" ? 18 : await readDecimals(tokenInInfo.address);
  const decimalsOut = tokenOutInfo.address === "native" ? 18 : await readDecimals(tokenOutInfo.address);
  const amountInUnits = parseUnits(input.amountIn, decimalsIn);

  const amounts = await publicClient.readContract({
    address: DEX_ROUTER_ADDRESS,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [amountInUnits, [pathIn, pathOut]],
  });
  const expectedOut = amounts[amounts.length - 1];
  const minOut = (expectedOut * BigInt(10000 - slippageBps)) / 10000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

  let data: `0x${string}`;
  let value = "0x0";
  if (tokenInInfo.address === "native") {
    data = encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactETHForTokens",
      args: [minOut, [pathIn, pathOut], ctx.walletAddress, deadline],
    });
    value = toHex(amountInUnits);
  } else if (tokenOutInfo.address === "native") {
    data = encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactTokensForETH",
      args: [amountInUnits, minOut, [pathIn, pathOut], ctx.walletAddress, deadline],
    });
  } else {
    data = encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactTokensForTokens",
      args: [amountInUnits, minOut, [pathIn, pathOut], ctx.walletAddress, deadline],
    });
  }

  return {
    ...baseCard,
    configured: true,
    expectedAmountOutFormatted: formatUnits(expectedOut, decimalsOut),
    minAmountOutFormatted: formatUnits(minOut, decimalsOut),
    tx: { to: DEX_ROUTER_ADDRESS, value, data },
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
    estimatedGas: estimatedGas.toString(),
  };
}
