// Regex fast-path for unambiguous requests (balance checks, sends, token launches)
// so they don't need a round trip to Claude. Anything this doesn't confidently
// parse falls through to the full tool-use agent in the chat route.

export type ParsedIntent = { name: string; input: Record<string, unknown> };

const ADDRESS = /0x[a-fA-F0-9]{40}/;
const TX_HASH = /0x[a-fA-F0-9]{64}/;

// Token name: "called X" / "named X" / "call it X", falling back to a quoted string
// anywhere in the message so `launch a token "Nomad" ...` also works.
function extractTokenName(text: string): string | null {
  const keyword = text.match(
    /\b(?:called|named|call it)\s+["“]?([a-zA-Z0-9 ]+?)["”]?(?=\s*[,(]|\s+(?:with|symbol|ticker|supply)|$)/i
  );
  if (keyword) return keyword[1].trim();
  const quoted = text.match(/["“]([a-zA-Z0-9 ]+)["”]/);
  return quoted ? quoted[1].trim() : null;
}

// Token symbol: "symbol X" / "ticker X" (colon optional), falling back to "(X)".
function extractTokenSymbol(text: string): string | null {
  const keyword = text.match(/\b(?:symbol|ticker)s?\s*:?\s*["“]?([a-zA-Z0-9]{1,10})["”]?/i);
  if (keyword) return keyword[1].trim().toUpperCase();
  const paren = text.match(/\(([a-zA-Z0-9]{2,10})\)/);
  return paren ? paren[1].toUpperCase() : null;
}

// Token supply: "supply 1000000" / "supply of 1,000,000" / "supply: 1m" — accepts
// k/m/b shorthand so "1M" and "1000000" both resolve to the same number.
function extractTokenSupply(text: string): string | null {
  const match = text.match(/\b(?:total\s+)?supply\s*(?:of|:)?\s*([\d,.]+)\s*([kKmMbB])?\b/);
  if (!match) return null;
  const [, numRaw, suffix] = match;
  const multiplier = { k: 1e3, m: 1e6, b: 1e9 }[suffix?.toLowerCase() as "k" | "m" | "b"] ?? 1;
  const value = Number(numRaw.replace(/,/g, "")) * multiplier;
  return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : null;
}

export function parseIntent(rawText: string): ParsedIntent | null {
  const text = rawText.trim();

  const txHashMatch = text.match(TX_HASH);
  if (txHashMatch && /\b(explain|what happened|decode)\b/i.test(text)) {
    return { name: "explain_transaction", input: { txHash: txHashMatch[0] } };
  }

  const sendMatch = text.match(/\bsend\s+([\d.]+)\s*([a-zA-Z]{2,10})?\s+to\s+(0x[a-fA-F0-9]{40})/i);
  if (sendMatch) {
    const [, amount, tokenSymbol, to] = sendMatch;
    return { name: "prepare_send", input: { to, amount, ...(tokenSymbol ? { tokenSymbol } : {}) } };
  }

  const swapMatch = text.match(
    /\bswap\s+([\d.]+)\s*([a-zA-Z]{2,10})\s+(?:for|to|into)\s+([a-zA-Z]{2,10})(?:\s+(?:with|at)\s+([\d.]+)%?\s*slippage)?/i
  );
  if (swapMatch) {
    const [, amountIn, tokenInSymbol, tokenOutSymbol, slippagePct] = swapMatch;
    return {
      name: "prepare_swap",
      input: {
        tokenInSymbol,
        tokenOutSymbol,
        amountIn,
        ...(slippagePct ? { slippageBps: Math.round(Number(slippagePct) * 100) } : {}),
      },
    };
  }

  if (/\b(launch|create|deploy)\b.*\btoken\b/i.test(text)) {
    const name = extractTokenName(text);
    const symbol = extractTokenSymbol(text);
    const totalSupply = extractTokenSupply(text);
    if (name && symbol && totalSupply) {
      return { name: "prepare_token_launch", input: { name, symbol, totalSupply } };
    }
    // Not enough info extracted confidently — let the full agent ask clarifying questions.
    return null;
  }

  if (/\btoken\s*(info|details)\b/i.test(text) && ADDRESS.test(text)) {
    return { name: "get_token_info", input: { tokenAddress: text.match(ADDRESS)![0] } };
  }

  if (/\b(transaction history|recent transactions|recent activity|my transactions|tx history|recent transfers)\b/i.test(text)) {
    const addressMatch = text.match(ADDRESS);
    return { name: "get_transaction_history", input: addressMatch ? { address: addressMatch[0] } : {} };
  }

  if (/\b(balance|wallet overview|how much mon|what'?s in my wallet)\b/i.test(text)) {
    const addressMatch = text.match(ADDRESS);
    return { name: "get_wallet_overview", input: addressMatch ? { address: addressMatch[0] } : {} };
  }

  return null;
}

const INTENT_RESPONSES: Record<string, string> = {
  prepare_send: "Prepared that transfer — review and sign below.",
  prepare_swap: "Prepared that swap — review and sign below.",
  prepare_token_launch: "Prepared that token deployment — review and sign below.",
  get_wallet_overview: "Here's your wallet overview.",
  get_token_info: "Here's that token's info.",
  get_transaction_history: "Here's your recent activity.",
  explain_transaction: "Here's what happened in that transaction.",
};

export function describeIntent(name: string): string {
  return INTENT_RESPONSES[name] ?? "Done.";
}
