import { CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Small celebratory banner shown right below a ConfirmationCard once its tx is
// mined — deliberately separate from the card itself (not just a badge) so a
// confirmed send/swap/launch gets a distinct, satisfying "it happened" moment.
export function TxConfirmedBanner({ hash, className }: { hash: `0x${string}`; className?: string }) {
  return (
    <a
      href={`https://testnet.monadexplorer.com/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group relative flex w-full max-w-md items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/15 dark:text-emerald-300",
        "animate-fade-in-up",
        className
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-emerald-400/30 blur-lg animate-glow-pulse" />
      <CheckCircle2 className="size-4 shrink-0 text-emerald-500 transition-transform duration-200 group-hover:scale-110" />
      <span className="flex-1">Transaction confirmed</span>
      <ExternalLink className="size-3.5 shrink-0 text-emerald-500/70 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
