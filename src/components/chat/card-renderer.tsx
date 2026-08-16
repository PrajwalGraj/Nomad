import type { ToolCard } from "@/lib/tools/types";
import { WalletOverviewCard } from "./cards/wallet-overview-card";
import { TokenInfoCard } from "./cards/token-info-card";
import { TxHistoryCard } from "./cards/tx-history-card";
import { ExplainTransactionCard } from "./cards/explain-transaction-card";
import { ConfirmationCard } from "./cards/confirmation-card";
import { SwapTokenPair } from "./cards/swap-token-pair";
import { TokenIcon } from "./cards/token-icon";
import { TokenLaunchCoin } from "./cards/token-launch-coin";

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
          cornerIcon={<TokenIcon symbol={card.token.symbol} className="size-10" />}
          rows={[
            { label: "Amount", value: `${card.amountFormatted} ${card.token.symbol}` },
            { label: "To", value: card.to },
          ]}
          tx={card.tx}
          estimatedGas={card.estimatedGasFormatted}
          disabledReason={card.insufficientBalance ? "Insufficient balance for this amount." : undefined}
        />
      );
    case "prepare_swap":
      return (
        <ConfirmationCard
          actionLabel={
            card.step === "approve"
              ? `Approve ${card.tokenIn.symbol}`
              : `Swap ${card.tokenIn.symbol} → ${card.tokenOut.symbol}`
          }
          titleContent={
            <SwapTokenPair
              label={card.step === "approve" ? "Approve" : "Swap"}
              tokenIn={card.tokenIn}
              tokenOut={card.tokenOut}
            />
          }
          rows={[
            { label: "Amount in", value: `${card.amountInFormatted} ${card.tokenIn.symbol}` },
            ...(card.step === "approve"
              ? [{ label: "Note", value: "Approves Kuru's router; ask to swap again after this confirms." }]
              : []),
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
          hero={<TokenLaunchCoin name={card.name} symbol={card.symbol} />}
          rows={[
            {
              label: "Total supply",
              value: `${Number(card.totalSupplyFormatted).toLocaleString()} ${card.symbol}`,
            },
            { label: "Decimals", value: "18" },
            { label: "Standard", value: "ERC-20, fixed supply" },
            { label: "Recipient", value: "100% minted to you" },
          ]}
          tx={card.tx}
          estimatedGas={card.configured ? card.estimatedGasFormatted : undefined}
          disabledReason={!card.configured ? card.reason : undefined}
        />
      );
    default:
      return null;
  }
}
