import { ArrowRight } from "lucide-react";
import { TokenIcon } from "./token-icon";

export function SwapTokenPair({
  label,
  tokenIn,
  tokenOut,
}: {
  label: string;
  tokenIn: { symbol: string };
  tokenOut: { symbol: string };
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex w-full items-center justify-center gap-3">
        <div className="flex basis-[30%] flex-col items-center gap-2">
          <TokenIcon symbol={tokenIn.symbol} className="w-full" />
          <span className="text-base font-semibold">{tokenIn.symbol}</span>
        </div>
        <ArrowRight className="size-8 shrink-0 text-muted-foreground" />
        <div className="flex basis-[30%] flex-col items-center gap-2">
          <TokenIcon symbol={tokenOut.symbol} className="w-full" />
          <span className="text-base font-semibold">{tokenOut.symbol}</span>
        </div>
      </div>
    </div>
  );
}
