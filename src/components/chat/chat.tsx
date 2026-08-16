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

const SUGGESTIONS = [
  { label: "Check my wallet", prompt: "What's in my wallet?", icon: Wallet },
  { label: "Send some MON", prompt: "Send 0.1 MON to 0x0000000000000000000000000000000000000000", icon: Send },
  { label: "Launch a Token", prompt: "Launch token called Nomad symbol NOM supply 1000000", icon: Rocket },
];

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
          <p className="text-balance text-sm text-muted-foreground sm:text-base max-w-sm">
            {isConnected
              ? "Ask Nomad to check a balance, send MON, or launch a token on the Monad testnet."
              : "Connect your wallet to get started."}
          </p>
        </div>
        
        <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
          <MessageInput value={inputText} onChange={setInputText} onSend={handleSend} disabled={isLoading || !isConnected} className="w-full" />
        </div>

        {isConnected && (
          <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setInputText(s.prompt)}
                className="group relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[20px] border border-border/80 bg-white/70 p-5 text-left backdrop-blur-md shadow-sm transition-all duration-400 hover:-translate-y-1 hover:border-brand/40 hover:bg-white hover:shadow-[0_12px_30px_-10px_rgba(131,110,249,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-fade-in-up"
                style={{ animationDelay: `${250 + i * 100}ms`, animationFillMode: "both" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-brand transition-all duration-400 group-hover:scale-110 group-hover:bg-brand group-hover:text-white group-hover:shadow-[0_0_15px_rgba(131,110,249,0.4)]">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex w-full items-center justify-between gap-2 mt-auto">
                  <span className="text-sm font-semibold text-foreground/80 transition-colors group-hover:text-brand line-clamp-2">{s.label}</span>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 opacity-0 -translate-x-3 translate-y-3 transition-all duration-400 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0">
                    <ArrowUpRight className="h-3 w-3 text-brand" />
                  </div>
                </div>
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
          <MessageInput value={inputText} onChange={setInputText} onSend={handleSend} disabled={isLoading || !isConnected} />
        </div>
      </div>
    </div>
  );
}
