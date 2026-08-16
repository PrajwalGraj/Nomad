"use client";

import { useEffect, useState } from "react";

const THINKING_MESSAGES = [
  "Nomad is thinking…",
  "Sipping some chai…",
  "Eating a samosa…",
  "Dusting off the ledger…",
  "Counting blocks on Monad…",
  "Untangling the gas fees…",
  "Warming up the wallet…",
  "Consulting the mempool…",
];

export function ThinkingIndicator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % THINKING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex animate-fade-in-up items-center gap-2.5 py-1 text-sm text-muted-foreground">
      <span className="sr-only" role="status" aria-live="polite">
        Nomad is thinking…
      </span>
      <span className="flex items-end gap-0.5" aria-hidden>
        <span className="size-1.5 animate-dot-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
        <span className="size-1.5 animate-dot-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
        <span className="size-1.5 animate-dot-bounce rounded-full bg-brand" />
      </span>
      <span key={index} className="animate-text-swap" aria-hidden>
        {THINKING_MESSAGES[index]}
      </span>
    </div>
  );
}
