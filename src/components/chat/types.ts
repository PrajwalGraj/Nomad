import type { ToolCard } from "@/lib/tools/types";

export type DisplayItem =
  | { id: string; type: "message"; role: "user" | "assistant"; text: string }
  | { id: string; type: "card"; card: ToolCard }
  | { id: string; type: "error"; text: string };
