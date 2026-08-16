import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// Action tools: return unsigned tx params only. Never executed server-side.
const actionTools: Tool[] = [
  {
    name: "prepare_send",
    description:
      "Prepare a native MON or ERC-20 token transfer. Returns unsigned transaction parameters for the user to review and sign in their wallet — this tool never broadcasts anything.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address, 0x-prefixed. Raw addresses only — no ENS-style resolution is available on Monad testnet." },
        amount: { type: "string", description: "Human-readable amount to send, e.g. '2.5'." },
        tokenSymbol: {
          type: "string",
          description: "Token symbol to send, e.g. 'MON' for native, or an ERC-20 symbol from known tokens. Defaults to 'MON'.",
        },
      },
      required: ["to", "amount"],
    },
  },
  {
    name: "prepare_swap",
    description:
      "Prepare a token swap via Kuru Flow, Monad's swap aggregator. Fetches a quote first, then returns unsigned swap calldata with a slippage-adjusted minimum output — or, if the sell-side token needs an on-chain approval first, an approve() call to sign instead (call this tool again afterward to get the actual swap). Never broadcasts anything.",
    input_schema: {
      type: "object",
      properties: {
        tokenInSymbol: { type: "string", description: "Symbol of the token to sell, e.g. 'MON' or 'USDC'." },
        tokenOutSymbol: { type: "string", description: "Symbol of the token to buy." },
        amountIn: { type: "string", description: "Human-readable amount of tokenIn to swap, e.g. '10'." },
        slippageBps: { type: "number", description: "Max slippage in basis points. Defaults to 100 (1%)." },
      },
      required: ["tokenInSymbol", "tokenOutSymbol", "amountIn"],
    },
  },
  {
    name: "prepare_token_launch",
    description:
      "Prepare a deployment of a new fixed-supply ERC-20 token via Nomad's factory contract. The entire supply mints to the caller. Returns unsigned deploy calldata — never broadcasts anything.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full token name, e.g. 'Nomad Coin'." },
        symbol: { type: "string", description: "Token ticker, e.g. 'NOMAD'." },
        totalSupply: { type: "string", description: "Human-readable total supply, e.g. '1000000'." },
      },
      required: ["name", "symbol", "totalSupply"],
    },
  },
];

// Read tools: execute immediately server-side, no signing required.
const readTools: Tool[] = [
  {
    name: "get_wallet_overview",
    description: "Get a wallet's native MON balance, known ERC-20 token balances, and outgoing transaction count.",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to look up. Defaults to the currently connected wallet." },
      },
      required: [],
    },
  },
  {
    name: "get_token_info",
    description: "Get an ERC-20 token's name, symbol, decimals, and total supply.",
    input_schema: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "Token contract address, 0x-prefixed." },
      },
      required: ["tokenAddress"],
    },
  },
  {
    name: "get_transaction_history",
    description:
      "Get recent ERC-20 transfer activity for a wallet address, scanned directly from chain logs (no indexer is wired up, so native MON sends without an ERC-20 transfer are not shown).",
    input_schema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to look up. Defaults to the currently connected wallet." },
        limit: { type: "number", description: "Max number of transfers to return. Defaults to 10." },
      },
      required: [],
    },
  },
  {
    name: "explain_transaction",
    description:
      "Fetch a transaction's receipt, decode its logs against known ABIs (ERC-20 Transfer, etc.), and return structured data for you to summarize in plain English for the user.",
    input_schema: {
      type: "object",
      properties: {
        txHash: { type: "string", description: "Transaction hash, 0x-prefixed." },
      },
      required: ["txHash"],
    },
  },
];

export const allTools: Tool[] = [...actionTools, ...readTools];

export const ACTION_TOOL_NAMES = new Set(actionTools.map((t) => t.name));
export const READ_TOOL_NAMES = new Set(readTools.map((t) => t.name));
