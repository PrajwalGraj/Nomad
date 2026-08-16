export type TxParams = {
  to: `0x${string}`;
  value: string; // hex
  data: `0x${string}`;
};

export type PrepareSendCard = {
  kind: "prepare_send";
  to: `0x${string}`;
  amountFormatted: string;
  token: { symbol: string; address: `0x${string}` | "native"; decimals: number };
  tx: TxParams;
  estimatedGas: string;
  insufficientBalance: boolean;
};

export type PrepareSwapCard = {
  kind: "prepare_swap";
  configured: boolean;
  reason?: string;
  // "approve" when tokenIn is an ERC-20 with insufficient allowance for Kuru's
  // router — the returned tx is an approve() call, not the swap itself. Call
  // prepare_swap again after it confirms to get the actual swap tx.
  step?: "approve" | "swap";
  tokenIn: { symbol: string; address: `0x${string}` | "native" };
  tokenOut: { symbol: string; address: `0x${string}` | "native" };
  amountInFormatted: string;
  expectedAmountOutFormatted?: string;
  minAmountOutFormatted?: string;
  slippageBps: number;
  tx?: TxParams;
};

export type PrepareLaunchCard = {
  kind: "prepare_token_launch";
  configured: boolean;
  reason?: string;
  estimatedGas?: string;
  name: string;
  symbol: string;
  totalSupplyFormatted: string;
  tx?: TxParams;
};

export type WalletOverviewCard = {
  kind: "wallet_overview";
  address: `0x${string}`;
  nativeBalanceFormatted: string;
  tokens: { symbol: string; address: `0x${string}`; balanceFormatted: string }[];
  txCount: number;
};

export type TokenInfoCard = {
  kind: "token_info";
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  totalSupplyFormatted: string;
  priceNote: string;
};

export type TransferEntry = {
  txHash: `0x${string}`;
  blockNumber: string;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amountFormatted: string;
  direction: "in" | "out";
};

export type TxHistoryCard = {
  kind: "tx_history";
  address: `0x${string}`;
  transfers: TransferEntry[];
  note: string;
};

export type DecodedEvent = {
  name: string;
  summary: string;
};

export type ExplainTransactionCard = {
  kind: "explain_transaction";
  hash: `0x${string}`;
  status: "success" | "reverted";
  from: `0x${string}`;
  to: `0x${string}` | null;
  valueFormatted: string;
  gasUsed: string;
  decodedEvents: DecodedEvent[];
};

export type ToolCard =
  | PrepareSendCard
  | PrepareSwapCard
  | PrepareLaunchCard
  | WalletOverviewCard
  | TokenInfoCard
  | TxHistoryCard
  | ExplainTransactionCard;
