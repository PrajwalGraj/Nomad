import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function TxHashLink({
  hash,
  status = "neutral",
  className,
}: {
  hash: string;
  status?: "success" | "failed" | "neutral";
  className?: string;
}) {
  return (
    <a
      href={`https://testnet.monadexplorer.com/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 font-mono text-xs transition-colors hover:underline",
        status === "success" && "text-emerald-600 dark:text-emerald-400",
        status === "failed" && "text-destructive",
        status === "neutral" && "text-muted-foreground",
        className
      )}
    >
      <span className="truncate">{shortHash(hash)}</span>
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}
