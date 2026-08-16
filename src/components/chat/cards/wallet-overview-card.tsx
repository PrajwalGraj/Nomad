import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WalletOverviewCard as WalletOverviewCardType } from "@/lib/tools/types";
import { TokenIcon } from "./token-icon";

export function WalletOverviewCard({ card }: { card: WalletOverviewCardType }) {
  return (
    <Card className="tool-card w-full max-w-md ring-0">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">Wallet overview</CardTitle>
        <p className="font-mono text-xs text-muted-foreground">{card.address}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TokenIcon symbol="MON" className="size-7" />
            <span className="text-sm text-muted-foreground">MON</span>
          </div>
          <span className="text-lg font-semibold">{card.nativeBalanceFormatted}</span>
        </div>
        <Separator />
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Outgoing tx count</span>
          <span>{card.txCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
