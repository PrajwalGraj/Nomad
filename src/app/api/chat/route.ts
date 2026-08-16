import { NextResponse } from "next/server";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { anthropic, NOMAD_MODEL, SYSTEM_PROMPT } from "@/lib/anthropic";
import { allTools } from "@/lib/tools/schema";
import { executeTool } from "@/lib/tools/execute";
import { parseIntent, describeIntent } from "@/lib/tools/intent-parser";
import type { ToolCard } from "@/lib/tools/types";
import type { Address } from "viem";
import { isAddress } from "viem";

const MAX_AGENT_ITERATIONS = 6;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, walletAddress } = body as { messages: MessageParam[]; walletAddress?: string };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }
  if (walletAddress && !isAddress(walletAddress)) {
    return NextResponse.json({ error: "walletAddress is not a valid address." }, { status: 400 });
  }

  // Fast path: unambiguous requests (balance checks, sends, token launches with all
  // params given) are parsed with plain regex and executed directly — no LLM call,
  // so these work even without ANTHROPIC_API_KEY configured. Anything the parser
  // isn't confident about falls through to the full tool-use agent below.
  const lastMessage = messages[messages.length - 1];
  const lastText = lastMessage?.role === "user" && typeof lastMessage.content === "string" ? lastMessage.content : null;
  const intent = lastText ? parseIntent(lastText) : null;

  if (intent) {
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Connect a wallet before requesting an on-chain action or lookup." },
        { status: 400 }
      );
    }
    const { card, resultForModel, isError } = await executeTool(intent.name, intent.input, {
      walletAddress: walletAddress as Address,
    });
    if (isError) {
      const message = (resultForModel as { error?: string })?.error ?? "Couldn't complete that request.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const text = describeIntent(intent.name);
    const history: MessageParam[] = [...messages, { role: "assistant", content: text }];
    return NextResponse.json({ messages: history, text, cards: card ? [card] : [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 500 });
  }

  const history: MessageParam[] = [...messages];
  const cards: ToolCard[] = [];

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: NOMAD_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: allTools,
      messages: history,
    });

    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return NextResponse.json({ messages: history, text, cards });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Connect a wallet before requesting an on-chain action or lookup." },
        { status: 400 }
      );
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const { card, resultForModel, isError } = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        { walletAddress: walletAddress as Address }
      );
      if (card) cards.push(card);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(resultForModel),
        is_error: isError,
      });
    }

    history.push({ role: "user", content: toolResults });
  }

  return NextResponse.json(
    { error: "Agent exceeded its tool-call budget for this turn." },
    { status: 500 }
  );
}
