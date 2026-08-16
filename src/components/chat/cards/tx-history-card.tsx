import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TxHistoryCard as TxHistoryCardType } from "@/lib/tools/types";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relativeTime(unixSeconds: string) {
  const seconds = Math.max(0, Date.now() / 1000 - Number(unixSeconds));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function TxHistoryCard({ card }: { card: TxHistoryCardType }) {
  return (
    <Card className="tool-card w-full max-w-md ring-0">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {card.activity.length === 0 && <p className="text-sm text-muted-foreground">No activity found.</p>}
        {card.activity.map((a) => (
          <a
            key={a.txHash}
            href={`https://testnet.monadexplorer.com/tx/${a.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm hover:bg-accent"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge variant={a.direction === "in" ? "default" : "secondary"}>
                {a.direction === "in" ? "IN" : a.direction === "out" ? "OUT" : "—"}
              </Badge>
              <div className="min-w-0">
                <p className="truncate font-medium">{a.summary}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {short(a.counterparty)} · {short(a.txHash)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {a.status === "failed" && (
                <Badge variant="destructive" className="text-[10px]">
                  failed
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{relativeTime(a.timestamp)}</span>
            </div>
          </a>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">{card.note}</p>
      </CardContent>
    </Card>
  );
}
