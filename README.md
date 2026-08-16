# Nomad

A chat interface for Monad testnet. Type what you want — check a balance, send
MON, swap a token, launch a token — and Nomad turns it into a transaction and
shows you a confirmation card before anything happens. Nothing gets signed
until you approve it yourself, in your own wallet.

Most of what Nomad does is handled by matching your message against a set of
recognized command patterns (send, swap, launch, balance, token lookup,
explain-a-transaction) and turning that directly into calldata — no model
call, no round trip, just parsing and a viem call.
Anything outside those patterns falls through to an LLM to figure out intent,
which is optional and only needed for that overflow case.

## Links

| | |
|---|---|
| **Live app** | https://nomadchat.vercel.app/ |
| **Repo** | https://github.com/PrajwalGraj/Nomad |
| **NomadTokenFactory (Monad testnet)** | [`0x526F54924b8675f6D15e114C48F830a6a418e408`](https://testnet.monadexplorer.com/address/0x526F54924b8675f6D15e114C48F830a6a418e408) — verified, source published |
| **NomadTokenFactory (Monad mainnet)** | [`0x526F54924b8675f6D15e114C48F830a6a418e408`](https://monadscan.com/address/0x526F54924b8675f6D15e114C48F830a6a418e408) |
| **Chain** | Monad Testnet, chain ID `10143` |

The mainnet factory is deployed and live on-chain (same bytecode, same
address as testnet — a fresh deployer's first transaction lands at the same
address on any EVM chain, independent of chain ID). It hasn't been verified
on Monadscan yet, and the app itself is still wired to Monad testnet only —
see [Stack](#stack).

## What it does

- **Check a balance** — native MON plus any ERC-20s you've configured.
- **Send MON or a token** — builds the transfer, shows a gas cost estimate
  priced in MON (Monad charges gas on the *limit* you set, not what a
  transaction actually uses, so the estimate reflects that).
- **Swap** — routed through Kuru Flow, Monad's swap aggregator, and builds a
  correct, ready-to-sign swap transaction. **Doesn't currently execute
  end-to-end in a live demo** — Monad testnet doesn't have enough liquidity
  on the pairs we've tried, so Kuru returns "no candidate paths available"
  even though the transaction itself is built correctly. See
  [Swaps](#swaps).
- **Launch a token** — deploys a fixed-supply ERC-20 through Nomad's own
  factory contract. Mint-and-deploy, no bonding curve, full supply goes to
  whoever signs.
- **Look up a token** — name, symbol, decimals, total supply, read straight
  off the contract. No price — there's no reliable price feed for Monad
  testnet tokens yet, so we don't fake one.
- **Explain a transaction** — decodes a receipt's logs and summarizes it in
  plain English instead of dumping raw hex at you.
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
npm run dev
```

That's it. Balance checks, sends, launches, token lookups, and explains all
work straight away — the app runs with nothing else to configure. Swaps
build correctly too, but see [Swaps](#swaps) for why they won't complete
live on testnet right now.

Open `http://localhost:3000`, connect a wallet on Monad testnet, and try it out.

Commands to try:

- `What's in my wallet?`
- `Send 0.1 MON to 0x5f525806C6980BC2Aa3040228DeF3447248160B4`
- `Launch a token called Nomad with symbol NOM and total supply 1,000,000`
- `token info 0x3bA3d39AFcf8bb994f7964B3e0171Ea2Ba361570`
- `explain <a transaction hash>` — any hash works, including one of your own

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
point `FACTORY_ADDRESS` in `src/lib/contracts/factory.ts` at your deployed
address.

## Swaps

`prepare_swap` routes through [Kuru Flow](https://docs.monad.xyz/guides/kuru-flow)
(`src/lib/kuru.ts`), Monad's own documented swap aggregator — no on-chain
quote call or router ABI to maintain, it returns ready-to-sign calldata from
a REST API.

We verified this independently before wiring it in:

- All 6 documented Kuru testnet contracts (Router, Margin Account, Forwarder,
  Deployer, Utils, and the MON-USDC market) return real bytecode via
  `cast code <address> --rpc-url https://testnet-rpc.monad.xyz`.
- `https://ws.kuru.io/api/generate-token` and `/api/quote` are live and
  respond with the documented shape.

So the integration itself is correct — Kuru's contracts exist, its API
responds, and `prepare_swap` builds a valid transaction. What doesn't work
right now is completing a swap live: **there isn't enough liquidity on Monad
testnet for the pairs we've tried**, so the quote comes back "no candidate
paths available" before it ever gets to signing. This is a testnet-liquidity
problem, not a bug in the integration.

If the sell-side token needs an allowance, `prepare_swap` returns an
`approve()` call instead of the swap (`step: "approve"` on the card) — call
it again after that confirms to get the actual swap.

### Testnet reset caveat

Monad testnet appears to have reset around Nov 12, 2026 — several
documented DEX contract addresses (Nad.fun, LFJ, Nabla) came back with empty
bytecode on the current chain state when we checked, while Multicall3's
canonical address is live (ruling out an RPC issue). Kuru Flow's own
contracts are confirmed live, for what it's worth. Lesson: always re-check
`cast code <address> --rpc-url https://testnet-rpc.monad.xyz` before trusting
a documented address on this testnet, docs alone aren't enough.


---

Built by [@prajwalgraj](https://github.com/PrajwalGraj) and [@sohumvenkatadri7](https://github.com/sohumvenkatadri7).
