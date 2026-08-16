import { cn } from "@/lib/utils";

export function MessageBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-lg whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
          role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {text}
      </div>
    </div>
  );
}
