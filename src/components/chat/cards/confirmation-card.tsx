"use client";

import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TxParams } from "@/lib/tools/types";

type Row = { label: string; value: string };

export function ConfirmationCard({
  actionLabel,
  rows,
  tx,
  estimatedGas,
  disabledReason,
}: {
  actionLabel: string;
  rows: Row[];
  tx: TxParams | undefined;
  estimatedGas?: string;
  disabledReason?: string;
}) {
  const [rejected, setRejected] = useState(false);
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const canConfirm = !!tx && !disabledReason && !rejected && !hash;

  return (
    <Card className="w-full max-w-md border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{actionLabel}</CardTitle>
        {isConfirmed && <Badge>confirmed</Badge>}
        {hash && !isConfirmed && <Badge variant="secondary">{isConfirming ? "confirming…" : "submitted"}</Badge>}
        {rejected && <Badge variant="destructive">rejected</Badge>}
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
        {hash && (
          <a
            href={`https://testnet.monadexplorer.com/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-xs text-muted-foreground hover:underline"
          >
            {hash}
          </a>
        )}
      </CardContent>
      {!hash && !rejected && (
        <CardFooter className="gap-2">
          <Button
            className="flex-1"
            disabled={!canConfirm || isPending}
            onClick={() => tx && sendTransaction({ to: tx.to, value: BigInt(tx.value), data: tx.data })}
          >
            {isPending ? "Confirm in wallet…" : "Confirm"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setRejected(true)} disabled={isPending}>
            Reject
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
