# Nomad

A chat interface for Monad testnet. Type what you want — check a balance, send
MON, swap a token, launch a token — and Nomad turns it into a transaction and
shows you a confirmation card before anything happens. Nothing gets signed
until you approve it yourself, in your own wallet.

Most of what Nomad does is handled by matching your message against a set of
recognized command patterns (send, swap, launch, balance, transaction
history, token lookup, explain-a-transaction) and turning that directly into
calldata — no model call, no round trip, just parsing and a viem call.
Anything outside those patterns falls through to an LLM to figure out intent,
which is optional and only needed for that overflow case.

## Links

| | |
|---|---|
| **Live app** | https://nomadchat.vercel.app/ |
| **Repo** | https://github.com/PrajwalGraj/Nomad |
| **NomadTokenFactory (Monad testnet)** | [`0x526F54924b8675f6D15e114C48F830a6a418e408`](https://testnet.monadexplorer.com/address/0x526F54924b8675f6D15e114C48F830a6a418e408) — verified, source published |
| **Chain** | Monad Testnet, chain ID `10143` |

## What it does

- **Check a balance** — native MON plus any ERC-20s you've configured.
- **Send MON or a token** — builds the transfer, shows a gas cost estimate
  priced in MON (Monad charges gas on the *limit* you set, not what a
  transaction actually uses, so the estimate reflects that).
- **Swap** — routed through Kuru Flow, Monad's swap aggregator. See the
  [Swaps](#swaps) section below for what's actually been verified to work.
- **Launch a token** — deploys a fixed-supply ERC-20 through Nomad's own
  factory contract. Mint-and-deploy, no bonding curve, full supply goes to
  whoever signs.
- **Look up a token** — name, symbol, decimals, total supply, read straight
  off the contract. No price — there's no reliable price feed for Monad
  testnet tokens yet, so we don't fake one.
- **Explain a transaction** — decodes a receipt's logs and summarizes it in
  plain English instead of dumping raw hex at you.
- **Recent activity** — pulls your last few transactions with a one-line
  summary of each, via Monad's Etherscan-compatible explorer API.
- **Contacts** — save a name to an address in the sidebar, then type `@name`
  in the chat box to autocomplete it anywhere you'd use an address. Stored in
  the browser, not the wallet.

Every one of these returns *unsigned* transaction data. Nomad never holds a
key and never broadcasts anything on its own — you confirm or reject in your
connected wallet.

## Stack

- Next.js (App Router), TypeScript, Tailwind, shadcn/ui
- wagmi + viem + RainbowKit, configured for Monad testnet
- A Next.js API route (`/api/chat`) that matches commands directly, or hands
  off to Claude (Anthropic's tool-use API) for anything it doesn't recognize
- Foundry contracts: `NomadToken` (fixed-supply ERC-20) and
  `NomadTokenFactory` (deploys one per `launchToken()` call)
- Kuru Flow for swap routing and quotes
- Deployed on Vercel

## Running it locally

```bash
git clone https://github.com/PrajwalGraj/Nomad.git
cd nomad
npm install
cp .env.local.example .env.local
npm run dev
```

That's enough to get balance checks, sends, swaps, launches, token lookups,
and transaction history working — `NOMAD_FACTORY_ADDRESS` already defaults to
the deployed testnet factory above, so you don't need to deploy your own to
try it.

### Environment variables

| Variable | Required? | What it's for |
|---|---|---|
| `ETHERSCAN_API_KEY` | Yes, for transaction history | Free key at [etherscan.io/apis](https://etherscan.io/apis) — one key works across chains via `chainid=10143` for Monad testnet |
| `ANTHROPIC_API_KEY` | No | Only used when a message doesn't match a recognized command pattern |
| `NOMAD_MODEL` | No | Defaults to `claude-sonnet-5` |
| `NOMAD_FACTORY_ADDRESS` | No | Defaults to the deployed factory above; set this if you deploy your own |
| `NOMAD_KNOWN_TOKENS` | No | Comma-separated `SYMBOL:0xaddress` pairs shown in balance/send/swap — we use `USDC:0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570,WETH:0x45477f4709771331db81944A5E20eF95Bc7BA2D7,WMON:0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541` |
| `KURU_FLOW_API_BASE` | No | Defaults to `https://ws.kuru.io` |
| `KURU_REFERRER_ADDRESS`, `KURU_REFERRER_FEE_BPS` | No | Collect a referral fee on swaps you route |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Only needed for WalletConnect-based wallets in RainbowKit |

## Smart contracts

Fixed-supply ERC-20 factory — `contracts/src/NomadToken.sol` and
`contracts/src/NomadTokenFactory.sol`, built with Foundry.

```bash
cd contracts
forge test              # 3/3 should pass
```

To deploy your own instance:

```bash
forge script script/DeployFactory.s.sol:DeployFactory \
  --rpc-url monad_testnet --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

Or via [Remix](https://remix.ethereum.org): paste `NomadToken.sol` and
`NomadTokenFactory.sol` into a new workspace (swap `NomadToken.sol`'s import
to `@openzeppelin/contracts/token/ERC20/ERC20.sol` — Remix resolves npm
packages directly, no Foundry remapping needed), compile with Solidity
≥0.8.24, switch the Deploy panel's environment to "Injected Provider" with
MetaMask on Monad Testnet, and deploy `NomadTokenFactory` (not `NomadToken` —
that one only ever gets created by the factory's `launchToken` call). Then
set `NOMAD_FACTORY_ADDRESS` in `.env.local` to your deployed address.

## Swaps

`prepare_swap` routes through [Kuru Flow](https://docs.monad.xyz/guides/kuru-flow)
(`src/lib/kuru.ts`), Monad's own documented swap aggregator — no on-chain
quote call or router ABI to maintain, it returns ready-to-sign calldata from
a REST API. No env var is required to turn it on.

We verified this independently before wiring it in (see the testnet-reset
note below — don't take vendor docs at face value on a testnet):

- All 6 documented Kuru testnet contracts (Router, Margin Account, Forwarder,
  Deployer, Utils, and the MON-USDC market) return real bytecode via
  `cast code <address> --rpc-url https://testnet-rpc.monad.xyz`.
- `https://ws.kuru.io/api/generate-token` and `/api/quote` are live and
  respond with the documented shape.

What we haven't fully verified: a live quote against every ERC-20 pair —
route availability depends on what liquidity actually exists on testnet at
any given moment, so a specific pair can come back with "no candidate paths
available" even though the integration itself is correct. Native MON swaps
are the most reliable path. If you're demoing a specific pair, quote it a
few minutes beforehand.

If the sell-side token needs an allowance, `prepare_swap` returns an
`approve()` call instead of the swap (`step: "approve"` on the card) — call
it again after that confirms to get the actual swap.

### Testnet reset caveat

Monad testnet appears to have reset around Nov 12, 2026. While verifying DEX
candidates for `prepare_swap`, we checked documented Monad testnet contract
addresses from three independent protocols directly against
`https://testnet-rpc.monad.xyz` (chain ID `10143`) via `eth_getCode`:

| Protocol | Docs source | Result |
|---|---|---|
| Nad.fun | `github.com/Naddotfun/contract-v3-abi` | Testnet closed Nov 12; repo only documents mainnet addresses |
| LFJ (RouterLogic) | `developers.lfj.gg/deployment-addresses/monad_testnet` | Address matches docs exactly, but **empty bytecode on-chain** |
| Nabla | `docs.nabla.fi/developers/contract-addresses/monad-testnet` | All 5 documented addresses (Portal, Router, Pyth Adapter, pools) **empty bytecode on-chain** |

As a sanity check, Multicall3's canonical address
(`0xcA11bde05977b3631167028862bE2a173976CA11`) *does* have live bytecode on
the same RPC, so this isn't an RPC/tooling issue — it's commonly
auto-redeployed by anyone via a deterministic factory on a fresh chain,
independent of whether individual protocols have redeployed. That fits a
testnet-reset explanation: chain ID `10143` is live and advancing, but none
of those three protocols had redeployed to the current chain state behind
that RPC at the time we checked. Worth re-checking liveness with `cast code`
before wiring in any DEX address rather than trusting docs alone.

## Known limitations

- **Transaction history and the sidebar's activity feed both depend on a
  working `ETHERSCAN_API_KEY`.** Without one (or with an invalid one), both
  fail — everything else works independently of it.
- **No live price feed.** Token lookups report supply and decimals, not
  price — no reliable source exists for Monad testnet pricing yet.
- **Swap route availability isn't guaranteed** for every pair, since it
  depends on live testnet liquidity through Kuru Flow. See [Swaps](#swaps).

## Cut for hackathon scope

Credits/rate-limiting, multi-model routing, NFT search, fund-flow tracing,
validator/staking data, CSV export, pro mode/payments.
