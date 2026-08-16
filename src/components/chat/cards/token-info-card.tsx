import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenIcon } from "./token-icon";
import type { TokenInfoCard as TokenInfoCardType } from "@/lib/tools/types";

export function TokenInfoCard({ card }: { card: TokenInfoCardType }) {
  return (
    <Card className="tool-card w-full max-w-md ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="text-sm font-medium">
            {card.name} <span className="text-muted-foreground">({card.symbol})</span>
          </CardTitle>
          <p className="font-mono text-xs text-muted-foreground">{card.address}</p>
        </div>
        <TokenIcon symbol={card.symbol} className="size-10" hideOnError />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-20 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          No price chart available
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Decimals</span>
          <span className="text-right">{card.decimals}</span>
          <span className="text-muted-foreground">Total supply</span>
          <span className="text-right">{card.totalSupplyFormatted}</span>
        </div>
        <p className="text-xs text-muted-foreground">{card.priceNote}</p>
      </CardContent>
    </Card>
  );
}
