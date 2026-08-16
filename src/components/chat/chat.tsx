"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { CardRenderer } from "./card-renderer";
import { ThinkingIndicator } from "./thinking-indicator";
import type { DisplayItem } from "./types";
import type { ToolCard } from "@/lib/tools/types";

let idCounter = 0;
const nextId = () => `item-${++idCounter}`;

const SUGGESTIONS = ["What's in my wallet?", "Send 0.1 MON to vitalik.eth", "Launch a token called Nomad"];

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-blob absolute -top-32 -right-24 size-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="animate-blob-delayed absolute -bottom-40 -left-24 size-96 rounded-full bg-primary/15 blur-3xl" />
    </div>
  );
}

export function Chat() {
  const { address, isConnected } = useAccount();
  const [history, setHistory] = useState<MessageParam[]>([]);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, isLoading]);

  async function handleSend(text: string) {
    const nextHistory: MessageParam[] = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    setItems((prev) => [...prev, { id: nextId(), type: "message", role: "user", text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory, walletAddress: address }),
      });
      const data = await res.json();

      if (!res.ok) {
        setItems((prev) => [...prev, { id: nextId(), type: "error", text: data.error ?? "Something went wrong." }]);
        return;
      }

      setHistory(data.messages);
      setItems((prev) => [
        ...prev,
        ...(data.cards as ToolCard[]).map((card) => ({ id: nextId(), type: "card" as const, card })),
        ...(data.text ? [{ id: nextId(), type: "message" as const, role: "assistant" as const, text: data.text }] : []),
      ]);
    } catch {
      setItems((prev) => [...prev, { id: nextId(), type: "error", text: "Network error — is the server running?" }]);
    } finally {
      setIsLoading(false);
    }
  }


  if (items.length === 0) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-start gap-7 overflow-hidden p-4 pt-[14vh] sm:pt-[18vh]">
        <BackgroundGlow />
        <div className="flex max-w-lg flex-col items-center gap-3 text-center">
          <h1 className="text-gradient-brand font-heading text-5xl font-bold tracking-tight sm:text-6xl">
            Where should we go?
          </h1>
          <p className="text-balance text-sm text-muted-foreground sm:text-base">
            {isConnected
              ? "Ask Nomad to check a balance, send MON, or launch a token."
              : "Connect your wallet to get started."}
          </p>
        </div>
        <MessageInput onSend={handleSend} disabled={isLoading || !isConnected} className="w-full max-w-xl" />
        {isConnected && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand/50 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <BackgroundGlow />
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
          {items.map((item) => {
            if (item.type === "message")
              return (
                <div key={item.id} className="animate-fade-in-up">
                  <MessageBubble role={item.role} text={item.text} />
                </div>
              );
            if (item.type === "card")
              return (
                <div key={item.id} className="animate-fade-in-up">
                  <CardRenderer card={item.card} />
                </div>
              );
            return (
              <Alert key={item.id} variant="destructive" className="animate-fade-in-up">
                <AlertDescription>{item.text}</AlertDescription>
              </Alert>
            );
          })}
          {isLoading && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="mx-auto w-full max-w-2xl p-4">
        <MessageInput onSend={handleSend} disabled={isLoading || !isConnected} />
      </div>
    </div>
  );
}
