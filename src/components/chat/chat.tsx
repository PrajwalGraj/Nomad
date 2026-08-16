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
import { useContacts } from "@/hooks/use-contacts";
import { Wallet, Send, Rocket, ArrowUpRight, Sparkles, Bot } from "lucide-react";

const SUGGESTIONS = ["What's in my wallet?", "Send 0.1 MON to vitalik.nad", "Launch a token called Nomad"];

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="animate-blob absolute -top-32 -right-24 size-96 rounded-full bg-brand/20 blur-3xl" />
      <div className="animate-blob-delayed absolute -bottom-40 -left-24 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="animate-blob absolute top-[30%] -left-32 size-72 rounded-full bg-chart-1/10 blur-3xl" style={{ animationDelay: '-15s', animationDuration: '30s' }} />
    </div>
  );
}

export function Chat() {
  const { address, isConnected } = useAccount();
  const { contacts } = useContacts();
  const [history, setHistory] = useState<MessageParam[]>([]);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, isLoading]);

  useEffect(() => {
    const handleNewChat = () => {
      setHistory([]);
      setItems([]);
      setInputText("");
    };
    window.addEventListener("nomad-new-chat", handleNewChat);
    return () => window.removeEventListener("nomad-new-chat", handleNewChat);
  }, []);

  async function handleSend(text: string) {
    setInputText("");
    const nextHistory: MessageParam[] = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    
    const userMessageId = crypto.randomUUID();
    setItems((prev) => [...prev, { id: userMessageId, type: "message", role: "user", text }]);
    setIsLoading(true);

    try {
      // Read directly from localStorage to ensure we have the absolute latest contacts
      // even if the user just added one in the modal without refreshing.
      let currentContacts = contacts;
      try {
        const saved = localStorage.getItem("nomad-contacts");
        if (saved) currentContacts = JSON.parse(saved);
      } catch (e) {}

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory, walletAddress: address, contacts: currentContacts }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorId = crypto.randomUUID();
        setItems((prev) => [...prev, { id: errorId, type: "error", text: data.error ?? "Something went wrong." }]);
        return;
      }

      setHistory(data.messages);
      
      const newItems: DisplayItem[] = [
        ...(data.cards as ToolCard[]).map((card) => ({ id: crypto.randomUUID(), type: "card" as const, card })),
        ...(data.text ? [{ id: crypto.randomUUID(), type: "message" as const, role: "assistant" as const, text: data.text }] : []),
      ];
      
      setItems((prev) => [...prev, ...newItems]);
    } catch {
      const errorId = crypto.randomUUID();
      setItems((prev) => [...prev, { id: errorId, type: "error", text: "Network error — is the server running?" }]);
    } finally {
      setIsLoading(false);
    }
  }


  if (items.length === 0) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-start gap-8 overflow-hidden p-4 pt-[10vh] sm:pt-[12vh]">
        <BackgroundGlow />
        
        <div className="flex max-w-lg flex-col items-center gap-4 text-center animate-fade-in-up">
          <h1 className="text-gradient-brand font-heading text-5xl font-bold tracking-tight sm:text-6xl pb-1">
            Where should we go?
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Ask Nomad to check balance, send MON or launch a token
          </p>
        </div>
        
        <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
          <MessageInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            disabled={isLoading || !isConnected}
            walletConnected={isConnected}
            className="w-full"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInputText(s)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand/50 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <BackgroundGlow />
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pt-8 pb-32">
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
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-12">
        <div className="mx-auto w-full max-w-2xl">
          <MessageInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            disabled={isLoading || !isConnected}
            walletConnected={isConnected}
          />
        </div>
      </div>
    </div>
  );
}
