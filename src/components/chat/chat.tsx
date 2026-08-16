"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { CardRenderer } from "./card-renderer";
import type { DisplayItem } from "./types";
import type { ToolCard } from "@/lib/tools/types";

let idCounter = 0;
const nextId = () => `item-${++idCounter}`;

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
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="flex max-w-md flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Where should we go?</h1>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? "Ask Nomad to check a balance, send MON, or launch a token."
              : "Connect your wallet to get started."}
          </p>
        </div>
        <MessageInput onSend={handleSend} disabled={isLoading || !isConnected} className="w-full max-w-xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
          {items.map((item) => {
            if (item.type === "message") return <MessageBubble key={item.id} role={item.role} text={item.text} />;
            if (item.type === "card") return <CardRenderer key={item.id} card={item.card} />;
            return (
              <Alert key={item.id} variant="destructive">
                <AlertDescription>{item.text}</AlertDescription>
              </Alert>
            );
          })}
          {isLoading && <p className="text-sm text-muted-foreground">Nomad is thinking…</p>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="mx-auto w-full max-w-2xl p-4">
        <MessageInput onSend={handleSend} disabled={isLoading || !isConnected} />
      </div>
    </div>
  );
}
