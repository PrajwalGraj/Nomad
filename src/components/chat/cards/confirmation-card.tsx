"use client";

import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TxHashLink } from "./tx-hash-link";
import type { TxParams } from "@/lib/tools/types";
import { useEffect } from "react";

type Row = { label: string; value: string };

export function ConfirmationCard({
  actionLabel,
  titleContent,
  cornerIcon,
  rows,
  tx,
  estimatedGas,
  disabledReason,
}: {
  actionLabel: string;
  /** Optional richer header (e.g. token icons) shown instead of the plain actionLabel text. */
  titleContent?: React.ReactNode;
  /** Optional token/brand icon pinned to the top-right of the header. */
  cornerIcon?: React.ReactNode;
  rows: Row[];
  tx: TxParams | undefined;
  estimatedGas?: string;
  disabledReason?: string;
}) {
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const canConfirm = !!tx && !disabledReason && !hash;

  // Cache confirmed transactions locally so they appear immediately in the sidebar
  // even if the RPC doesn't index them (like native MON transfers).
  useEffect(() => {
    if (isConfirmed && hash) {
      try {
        const saved = localStorage.getItem("nomad-local-txs-v4");
        const txs = saved ? JSON.parse(saved) : [];
        if (!txs.find((t: any) => t.hash === hash)) {
          let summary = actionLabel;
          const amountRow = rows.find(r => r.label.toLowerCase() === "amount" || r.label.toLowerCase() === "amount in");
          const toRow = rows.find(r => r.label.toLowerCase() === "to");
          
          if (actionLabel.startsWith("Transfer") || actionLabel.startsWith("Send")) {
            summary = `Sent ${amountRow?.value || ""} to ${toRow?.value || "unknown"}`;
          } else {
            if (amountRow) summary += ` ${amountRow.value}`;
          }
          
          txs.unshift({ hash, summary, timestamp: Date.now() });
          localStorage.setItem("nomad-local-txs-v4", JSON.stringify(txs));
          window.dispatchEvent(new Event("nomad-tx-added"));
        }
      } catch (e) {}
    }
  }, [isConfirmed, hash, actionLabel, rows]);

  return (
    <Card className="tool-card w-full max-w-md ring-0">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <CardTitle className="min-w-0 flex-1 text-sm font-medium" aria-label={actionLabel}>
          {titleContent ?? actionLabel}
        </CardTitle>
        <div className="flex items-center gap-2">
          {cornerIcon}
          {isConfirmed && <Badge>confirmed</Badge>}
          {hash && !isConfirmed && <Badge variant="secondary">{isConfirming ? "confirming…" : "submitted"}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-right font-mono text-xs">{r.value}</span>
          </div>
        ))}
        {estimatedGas && (
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Estimated gas</span>
            <span className="text-right font-mono text-xs">{estimatedGas}</span>
          </div>
        )}
        {disabledReason && <p className="text-xs text-destructive">{disabledReason}</p>}
        {error && <p className="text-xs text-destructive">{error.message}</p>}
        {hash && <TxHashLink hash={hash} status={isConfirmed ? "success" : "neutral"} />}
      </CardContent>
      {!hash && (
        <CardFooter className="gap-2">
          <Button
            className="flex-1"
            disabled={!canConfirm || isPending}
            onClick={() => tx && sendTransaction({ to: tx.to, value: BigInt(tx.value), data: tx.data })}
          >
            {isPending ? "Confirm in wallet…" : "Confirm"}
          </Button>
          <Button variant="outline" className="flex-1" disabled={isPending}>
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
