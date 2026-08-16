export type KnownToken = {
  symbol: string;
  address: `0x${string}`;
};

// Optional comma-separated `SYMBOL:0xaddress` pairs, e.g. "USDC:0xabc...,WMON:0xdef..."
// Empty by default — wallet_overview will only show native MON balance until
// tokens are configured (or discovered on-chain) here.
function parseKnownTokens(raw: string | undefined): KnownToken[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [symbol, address] = entry.split(":");
      return { symbol: symbol.trim(), address: address.trim() as `0x${string}` };
    });
}

export const KNOWN_TOKENS: KnownToken[] = parseKnownTokens(process.env.NOMAD_KNOWN_TOKENS);
