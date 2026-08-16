import type { ToolCard } from "@/lib/tools/types";
import { WalletOverviewCard } from "./cards/wallet-overview-card";
import { TokenInfoCard } from "./cards/token-info-card";
import { TxHistoryCard } from "./cards/tx-history-card";
import { ExplainTransactionCard } from "./cards/explain-transaction-card";
import { ConfirmationCard } from "./cards/confirmation-card";

export function CardRenderer({ card }: { card: ToolCard }) {
  switch (card.kind) {
    case "wallet_overview":
      return <WalletOverviewCard card={card} />;
    case "token_info":
      return <TokenInfoCard card={card} />;
    case "tx_history":
      return <TxHistoryCard card={card} />;
    case "explain_transaction":
      return <ExplainTransactionCard card={card} />;
    case "prepare_send":
      return (
        <ConfirmationCard
          actionLabel={`Send ${card.token.symbol}`}
          rows={[
            { label: "Amount", value: `${card.amountFormatted} ${card.token.symbol}` },
            { label: "To", value: card.to },
          ]}
          tx={card.tx}
          estimatedGas={card.estimatedGas}
          disabledReason={card.insufficientBalance ? "Insufficient balance for this amount." : undefined}
        />
      );
    case "prepare_swap":
      return (
        <ConfirmationCard
          actionLabel={`Swap ${card.tokenIn.symbol} → ${card.tokenOut.symbol}`}
          rows={[
            { label: "Amount in", value: `${card.amountInFormatted} ${card.tokenIn.symbol}` },
            {
              label: "Expected out",
              value: card.expectedAmountOutFormatted
                ? `${card.expectedAmountOutFormatted} ${card.tokenOut.symbol}`
                : "—",
            },
            {
              label: "Min out",
              value: card.minAmountOutFormatted ? `${card.minAmountOutFormatted} ${card.tokenOut.symbol}` : "—",
            },
            { label: "Slippage", value: `${(card.slippageBps / 100).toFixed(2)}%` },
          ]}
          tx={card.tx}
          disabledReason={!card.configured ? card.reason : undefined}
        />
      );
    case "prepare_token_launch":
      return (
        <ConfirmationCard
          actionLabel="Launch token"
          rows={[
            { label: "Name", value: card.name },
            { label: "Symbol", value: card.symbol },
            { label: "Total supply", value: card.totalSupplyFormatted },
          ]}
          tx={card.tx}
          estimatedGas={card.configured ? card.estimatedGas : undefined}
          disabledReason={!card.configured ? card.reason : undefined}
        />
      );
    default:
      return null;
  }
}
