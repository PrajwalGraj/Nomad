import { cn } from "@/lib/utils";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-lg whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-md bg-brand text-brand-foreground shadow-[0_4px_16px_-8px_var(--brand)]"
            : "rounded-2xl rounded-bl-md border border-border bg-card text-card-foreground shadow-sm"
        )}
      >
        {text}
      </div>
    </div>
  );
}
