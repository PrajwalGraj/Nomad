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
    <div
      className={cn(
        "flex items-end gap-2 rounded-3xl border bg-background p-2 pl-4 shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
    >
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
        className="mb-0.5 shrink-0 rounded-full"
        aria-label="Send message"
      >
        <ArrowUp />
      </Button>
    </div>
  );
}
