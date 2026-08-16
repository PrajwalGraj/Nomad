import type { Address } from "viem";

// Kuru Flow — Monad's own documented swap aggregator (docs.monad.xyz/guides/kuru-flow),
// confirmed live on Monad testnet: all six Kuru testnet contracts (Router, Margin
// Account, Forwarder, Deployer, Utils, MON-USDC market) return real bytecode via
// `cast code --rpc-url https://testnet-rpc.monad.xyz`, and this API host answers
// /api/generate-token. Unlike the earlier Uniswap-V2-router approach this replaces,
// Kuru Flow returns ready-to-sign calldata from its REST API rather than requiring
// an on-chain quote call — there's no router ABI to maintain.
const KURU_FLOW_API = process.env.KURU_FLOW_API_BASE || "https://ws.kuru.io";
const REFERRER_ADDRESS = process.env.KURU_REFERRER_ADDRESS as Address | undefined;
const REFERRER_FEE_BPS = process.env.KURU_REFERRER_FEE_BPS ? Number(process.env.KURU_REFERRER_FEE_BPS) : undefined;

// Kuru's convention for native MON in tokenIn/tokenOut — not a real contract.
export const NATIVE_MON_SENTINEL = "0x0000000000000000000000000000000000000000" as const;

export type KuruQuoteResponse = {
  type: string;
  status: "success" | "error";
  output: string;
  minOut: string;
  transaction?: { to: string; calldata: string; value: string };
  message?: string;
};

async function generateKuruToken(userAddress: Address): Promise<string> {
  const res = await fetch(`${KURU_FLOW_API}/api/generate-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_address: userAddress }),
  });
  if (!res.ok) {
    throw new Error(`Kuru Flow auth failed (${res.status}).`);
  }
  const body = (await res.json()) as { token: string };
  return body.token;
}

export async function getKuruQuote(input: {
  userAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountUnits: string;
  slippageBps: number;
}): Promise<KuruQuoteResponse> {
  const token = await generateKuruToken(input.userAddress);
  const res = await fetch(`${KURU_FLOW_API}/api/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      userAddress: input.userAddress,
      tokenIn: input.tokenIn,
      tokenOut: input.tokenOut,
      amount: input.amountUnits,
      slippageTolerance: input.slippageBps,
      ...(REFERRER_ADDRESS
        ? { referrerAddress: REFERRER_ADDRESS, referrerFeeBps: REFERRER_FEE_BPS ?? 0 }
        : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Kuru Flow quote request failed (${res.status}).`);
  }
  return (await res.json()) as KuruQuoteResponse;
}
