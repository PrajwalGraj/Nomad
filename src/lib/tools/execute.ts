import { getAddress, isAddress, type Address } from "viem";
import { getTokenInfo, getTransactionHistory, getWalletOverview, explainTransaction } from "./read";
import { prepareSend, prepareSwap, prepareTokenLaunch } from "./actions";
import type { ToolCard } from "./types";

export type ToolExecutionContext = { walletAddress: Address };

export type ToolExecutionResult = {
  card: ToolCard | null;
  resultForModel: unknown;
  isError: boolean;
};

// Monad's RPC was observed rejecting requests outright (-32602 Invalid params)
// for addresses with an incorrect EIP-55 checksum, instead of the more common
// behavior of silently accepting any-case addresses. Normalizing to a correct
// checksum before any RPC call avoids that failure mode for addresses that
// arrive as free-form text (user messages, LLM output).
function normalizeAddress(value: string): Address {
  if (!isAddress(value)) throw new Error(`"${value}" is not a valid address.`);
  return getAddress(value);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    switch (name) {
      case "prepare_send": {
        const card = await prepareSend(
          input as { to: string; amount: string; tokenSymbol?: string },
          ctx
        );
        return { card, resultForModel: card, isError: false };
      }
      case "prepare_swap": {
        const card = await prepareSwap(
          input as { tokenInSymbol: string; tokenOutSymbol: string; amountIn: string; slippageBps?: number },
          ctx
        );
        return { card, resultForModel: card, isError: false };
      }
      case "prepare_token_launch": {
        const card = await prepareTokenLaunch(
          input as { name: string; symbol: string; totalSupply: string },
          ctx
        );
        return { card, resultForModel: card, isError: false };
      }
      case "get_wallet_overview": {
        const address = normalizeAddress((input.address as string | undefined) ?? ctx.walletAddress);
        const card = await getWalletOverview(address);
        return { card, resultForModel: card, isError: false };
      }
      case "get_token_info": {
        const card = await getTokenInfo(normalizeAddress(input.tokenAddress as string));
        return { card, resultForModel: card, isError: false };
      }
      case "get_transaction_history": {
        const address = normalizeAddress((input.address as string | undefined) ?? ctx.walletAddress);
        const limit = (input.limit as number | undefined) ?? 4;
        const card = await getTransactionHistory(address, limit);
        return { card, resultForModel: card, isError: false };
      }
      case "explain_transaction": {
        const txHash = input.txHash as string;
        if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error(`"${txHash}" is not a valid transaction hash.`);
        const card = await explainTransaction(txHash as `0x${string}`);
        return { card, resultForModel: card, isError: false };
      }
      default:
        return { card: null, resultForModel: { error: `Unknown tool "${name}"` }, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error executing tool.";
    return { card: null, resultForModel: { error: message }, isError: true };
  }
}
