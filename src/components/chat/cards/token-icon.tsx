"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Deterministic fallback color so a token keeps the same badge color across renders,
// even before/without a matching file in public/token-icons/.
const FALLBACK_PALETTE = [
  "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
];

function paletteFor(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

// Sized entirely by the caller's className (e.g. a flex-basis percentage) so it can
// scale as a fraction of its container instead of a fixed pixel size.
export function TokenIcon({ symbol, className }: { symbol: string; className?: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={cn("relative aspect-square shrink-0 overflow-hidden rounded-full ring-1 ring-border", className)}>
      {!imageFailed ? (
        // Drop a matching file in public/token-icons/<symbol>.svg (lowercase) to override the fallback.
        <img
          src={`/token-icons/${symbol.toLowerCase()}.svg`}
          alt={symbol}
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={cn("flex size-full items-center justify-center text-2xl font-semibold", paletteFor(symbol))}>
          {symbol.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}
