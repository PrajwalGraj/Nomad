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
  // Formatted as "<amount> MON" — gas limit * gas price, since Monad charges on the
  // limit, not what's actually used. See lib/tools/actions.ts formatGasCostMon.
  estimatedGasFormatted: string;
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
  estimatedGasFormatted?: string;
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

export type ActivityEntry = {
  txHash: `0x${string}`;
  timestamp: string; // unix seconds, as string
  status: "success" | "failed";
  direction: "in" | "out" | "self";
  counterparty: `0x${string}`;
  summary: string; // short plain-English description, e.g. "Sent 0.5 MON"
};

export type TxHistoryCard = {
  kind: "tx_history";
  address: `0x${string}`;
  activity: ActivityEntry[];
  note: string;
};

export type DecodedEvent = {
  name: string;
  summary: string;
};

export type TokenIconSpec =
  | { kind: "single"; symbol: string }
  | { kind: "swap"; tokenInSymbol: string; tokenOutSymbol: string };

export type ExplainTransactionCard = {
  kind: "explain_transaction";
  hash: `0x${string}`;
  status: "success" | "reverted";
  summary: string; // plain-English headline, e.g. "Swapped 0.5 MON for 12.3 USDC"
  icon?: TokenIconSpec;
  // "launch" swaps the From/To rows for the newly deployed token's address in the UI —
  // From (the deployer)/To (the factory) aren't the interesting addresses for a launch.
  detailType: "native_transfer" | "token_transfer" | "swap" | "launch" | "approve" | "deploy" | "contract" | "reverted";
  launchedTokenAddress?: `0x${string}`;
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
