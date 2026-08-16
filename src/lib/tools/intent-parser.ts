// Regex fast-path for unambiguous requests (balance checks, sends, token launches)
// so they don't need a round trip to Claude. Anything this doesn't confidently
// parse falls through to the full tool-use agent in the chat route.

export type ParsedIntent = { name: string; input: Record<string, unknown> };

const ADDRESS = /0x[a-fA-F0-9]{40}/;
const TX_HASH = /0x[a-fA-F0-9]{64}/;

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

  if (/\b(launch|create|deploy)\b.*\btoken\b/i.test(text)) {
    const nameMatch = text.match(/\b(?:called|named)\s+["“]?([a-zA-Z0-9 ]+?)["”]?(?=\s+(?:with|,|symbol|ticker)|$)/i);
    const symbolMatch = text.match(/\b(?:symbol|ticker)\s+["“]?([a-zA-Z0-9]+)["”]?/i);
    const supplyMatch = text.match(/\b(?:total\s+)?supply\s+(?:of\s+)?([\d,]+)/i);
    if (nameMatch && symbolMatch && supplyMatch) {
      return {
        name: "prepare_token_launch",
        input: {
          name: nameMatch[1].trim(),
          symbol: symbolMatch[1].trim(),
          totalSupply: supplyMatch[1].replace(/,/g, ""),
        },
      };
    }
    // Not enough info extracted confidently — let the full agent ask clarifying questions.
    return null;
  }

  if (/\btoken\s*(info|details)\b/i.test(text) && ADDRESS.test(text)) {
    return { name: "get_token_info", input: { tokenAddress: text.match(ADDRESS)![0] } };
  }

  if (/\b(transaction history|recent transactions|my transactions|tx history|recent transfers)\b/i.test(text)) {
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
  prepare_token_launch: "Prepared that token deployment — review and sign below.",
  get_wallet_overview: "Here's your wallet overview.",
  get_token_info: "Here's that token's info.",
  get_transaction_history: "Here's your recent transfer activity.",
  explain_transaction: "Here's what happened in that transaction.",
};

export function describeIntent(name: string): string {
  return INTENT_RESPONSES[name] ?? "Done.";
}
