"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MessageInput({
  onSend,
  disabled,
  className,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className={cn("search-glow-border group relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-[28px] bg-gradient-to-r from-brand/50 via-brand/20 to-primary/50 opacity-0 blur-lg transition-opacity duration-300 group-focus-within:animate-glow-pulse group-focus-within:opacity-100"
      />
      <div className="relative flex items-end gap-2 rounded-3xl bg-background p-2 pl-4 shadow-sm">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nomad to send, swap, launch a token, or check your wallet…"
          className="max-h-40 min-h-9 resize-none border-none bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
          rows={1}
        />
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="mb-0.5 shrink-0 rounded-full bg-gradient-to-br from-brand to-primary text-white transition-transform duration-150 ease-out hover:scale-105 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
          aria-label="Send message"
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  );
}
