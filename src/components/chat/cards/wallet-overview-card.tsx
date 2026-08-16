import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WalletOverviewCard as WalletOverviewCardType } from "@/lib/tools/types";

export function WalletOverviewCard({ card }: { card: WalletOverviewCardType }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Wallet overview</CardTitle>
        <p className="font-mono text-xs text-muted-foreground">{card.address}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">MON</span>
          <span className="text-lg font-semibold">{card.nativeBalanceFormatted}</span>
        </div>
        {card.tokens.length > 0 && (
          <>
            <Separator />
            {card.tokens.map((t) => (
              <div key={t.address} className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t.symbol}</span>
                <span className="text-sm">{t.balanceFormatted}</span>
              </div>
            ))}
          </>
        )}
        <Separator />
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Outgoing tx count</span>
          <span>{card.txCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
