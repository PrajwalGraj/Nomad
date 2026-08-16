export type KnownToken = {
  symbol: string;
  address: `0x${string}`;
};

// Public Monad testnet contract addresses — not secrets, safe to commit. Sourced from
// Monad's own token-list repo (github.com/monad-crypto/token-list) and Circle's official
// testnet USDC docs (developers.circle.com/stablecoins/usdc-contract-addresses), verified
// live via `cast code` against testnet-rpc.monad.xyz. USDC here is Kuru's own deployment
// (paired to their MON/USDC market, per monad-crypto/protocols/testnet/kuru.jsonc) rather
// than Circle's canonical one — Kuru's router only routes against its own token.
const DEFAULT_KNOWN_TOKENS: KnownToken[] = [
  { symbol: "USDC", address: "0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570" },
  { symbol: "WETH", address: "0x45477f4709771331db81944A5E20eF95Bc7BA2D7" },
  { symbol: "WMON", address: "0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541" },
];

// Optional comma-separated `SYMBOL:0xaddress` pairs, e.g. "USDC:0xabc...,WMON:0xdef..."
// Adds to (or overrides, by symbol) the defaults above — no env var needed to get the
// tokens above working, only to extend/replace them.
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

function mergeKnownTokens(defaults: KnownToken[], overrides: KnownToken[]): KnownToken[] {
  const bySymbol = new Map(defaults.map((t) => [t.symbol.toUpperCase(), t]));
  for (const t of overrides) bySymbol.set(t.symbol.toUpperCase(), t);
  return [...bySymbol.values()];
}

export const KNOWN_TOKENS: KnownToken[] = mergeKnownTokens(
  DEFAULT_KNOWN_TOKENS,
  parseKnownTokens(process.env.NOMAD_KNOWN_TOKENS)
);
