import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TxHistoryCard as TxHistoryCardType } from "@/lib/tools/types";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function TxHistoryCard({ card }: { card: TxHistoryCardType }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent transfers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {card.transfers.length === 0 && (
          <p className="text-sm text-muted-foreground">No transfers found in the scanned range.</p>
        )}
        {card.transfers.map((t) => (
          <a
            key={t.txHash}
            href={`https://testnet.monadexplorer.com/tx/${t.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <Badge variant={t.direction === "in" ? "default" : "secondary"}>
                {t.direction === "in" ? "IN" : "OUT"}
              </Badge>
              <span className="font-mono text-xs">{short(t.direction === "in" ? t.from : t.to)}</span>
            </div>
            <span>
              {t.amountFormatted} {t.tokenSymbol}
            </span>
          </a>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">{card.note}</p>
      </CardContent>
    </Card>
  );
}
