import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TxHashLink } from "./tx-hash-link";
import { TokenIcon } from "./token-icon";
import type { ExplainTransactionCard as ExplainTransactionCardType } from "@/lib/tools/types";

export function ExplainTransactionCard({ card }: { card: ExplainTransactionCardType }) {
  return (
    <Card className="tool-card w-full max-w-md ring-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Transaction</CardTitle>
        <Badge variant={card.status === "success" ? "default" : "destructive"}>{card.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          {card.icon?.kind === "single" && <TokenIcon symbol={card.icon.symbol} className="size-9" />}
          {card.icon?.kind === "swap" && (
            <div className="flex shrink-0 items-center -space-x-2.5">
              <TokenIcon symbol={card.icon.tokenInSymbol} className="size-9 ring-2 ring-background" />
              <TokenIcon symbol={card.icon.tokenOutSymbol} className="size-9 ring-2 ring-background" />
            </div>
          )}
          <p className="text-base font-semibold">{card.summary}</p>
        </div>
        <TxHashLink hash={card.hash} status={card.status === "success" ? "success" : "failed"} />
        <div className="grid grid-cols-2 gap-2 text-sm">
          {card.detailType === "launch" ? (
            card.launchedTokenAddress && (
              <>
                <span className="text-muted-foreground">Token address</span>
                <TxHashLink hash={card.launchedTokenAddress} type="address" className="justify-end" />
              </>
            )
          ) : (
            <>
              <span className="text-muted-foreground">From</span>
              <span className="truncate text-right font-mono text-xs">{card.from}</span>
              <span className="text-muted-foreground">To</span>
              <span className="truncate text-right font-mono text-xs">{card.to ?? "contract creation"}</span>
            </>
          )}
          <span className="text-muted-foreground">Value</span>
          <span className="text-right">{card.valueFormatted} MON</span>
          <span className="text-muted-foreground">Gas used</span>
          <span className="text-right">{card.gasUsed}</span>
        </div>
        {card.decodedEvents.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {card.decodedEvents.map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {e.summary}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
