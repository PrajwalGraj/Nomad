import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExplainTransactionCard as ExplainTransactionCardType } from "@/lib/tools/types";

export function ExplainTransactionCard({ card }: { card: ExplainTransactionCardType }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">Transaction</CardTitle>
        <Badge variant={card.status === "success" ? "default" : "destructive"}>{card.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <a
          href={`https://testnet.monadexplorer.com/tx/${card.hash}`}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-mono text-xs text-muted-foreground hover:underline"
        >
          {card.hash}
        </a>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">From</span>
          <span className="truncate text-right font-mono text-xs">{card.from}</span>
          <span className="text-muted-foreground">To</span>
          <span className="truncate text-right font-mono text-xs">{card.to ?? "contract creation"}</span>
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
