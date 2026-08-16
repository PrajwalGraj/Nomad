# Nomad

AI chat agent for Monad testnet. Chat in natural language to check on-chain data
or prepare send/swap/launch transactions — the agent (Claude, via Anthropic tool
use) never signs anything. Every action tool returns unsigned calldata; you review
it on a confirmation card and sign manually with your connected wallet.

## Deployed

- **NomadTokenFactory (Monad testnet):** [`0x526F54924b8675f6D15e114C48F830a6a418e408`](https://testnet.monadexplorer.com/address/0x526F54924b8675f6D15e114C48F830a6a418e408)
- **Live app:** _pending deploy_

## Stack

- Next.js 14+ (App Router) / TypeScript / Tailwind / shadcn/ui
- wagmi + viem + RainbowKit, configured for Monad testnet (chainId `10143`)
- Next.js API route (`/api/chat`) running the Claude tool-use agent loop
- Foundry-deployed ERC-20 factory contract (own "launchpad", fixed-supply mint-and-deploy)

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm run dev
```

To deploy the token factory, run the test suite first either way:

```bash
cd contracts
forge test                          # 3/3 should pass
```

Then deploy with either Foundry or Remix:

```bash
# Foundry CLI
forge script script/DeployFactory.s.sol:DeployFactory \
  --rpc-url monad_testnet --private-key $DEPLOYER_PRIVATE_KEY --broadcast
```

Or via [Remix](https://remix.ethereum.org): paste `NomadToken.sol` and
`NomadTokenFactory.sol` into a new workspace (swap `NomadToken.sol`'s import to
`@openzeppelin/contracts/token/ERC20/ERC20.sol` — Remix resolves npm packages
directly, no Foundry remapping needed), compile with Solidity ≥0.8.24, switch
the Deploy panel's environment to "Injected Provider" with MetaMask on Monad
Testnet, and deploy `NomadTokenFactory` (not `NomadToken` — that one only ever
gets created by the factory's `launchToken` call).

Either way, set `NOMAD_FACTORY_ADDRESS` in `.env.local` to the deployed address.

## Known issues / not wired up

- **`prepare_swap` is stubbed.** The quote + slippage-adjusted calldata logic is
  fully implemented (`src/lib/tools/actions.ts`) and generic over any Uniswap-V2-style
  router, but no live router is configured (`DEX_ROUTER_ADDRESS` unset) — the tool
  correctly reports "not configured" instead of guessing. Set the env var once a
  router is confirmed live and it works with no code changes.

- **Monad testnet appears to have reset around Nov 12, 2026.** While verifying DEX
  candidates for `prepare_swap`, we checked documented Monad testnet contract
  addresses from three independent protocols directly against
  `https://testnet-rpc.monad.xyz` (chainId `10143`) via `eth_getCode`:

  | Protocol | Docs source | Result |
  |---|---|---|
  | Nad.fun | `github.com/Naddotfun/contract-v3-abi` | Testnet closed Nov 12; repo only documents mainnet addresses |
  | LFJ (RouterLogic) | `developers.lfj.gg/deployment-addresses/monad_testnet` | Address matches docs exactly, but **empty bytecode on-chain** |
  | Nabla | `docs.nabla.fi/developers/contract-addresses/monad-testnet` | All 5 documented addresses (Portal, Router, Pyth Adapter, pools) **empty bytecode on-chain** |

  As a sanity check, Multicall3's canonical address (`0xcA11bde05977b3631167028862bE2a173976CA11`)
  *does* have live bytecode on the same RPC — so this isn't an RPC/tooling issue.
  Multicall3 is commonly auto-redeployed by anyone via a deterministic factory on
  a fresh chain, independent of whether individual protocols have redeployed —
  which fits a testnet-reset explanation: chain ID `10143` is live and advancing,
  but none of these three protocols have redeployed their contracts to the current
  chain state behind that RPC/chain-ID. Re-check liveness before wiring any DEX
  address in — don't trust docs alone, run `cast code <address> --rpc-url
  https://testnet-rpc.monad.xyz` first.

- **No indexer wired up.** `get_transaction_history` falls back to unfiltered
  `eth_getLogs` over the last ~5000 blocks for ERC-20 Transfer events — native MON
  sends don't emit logs and won't show up. Wiring Envio HyperIndex or Goldsky
  would fix this if either has a live Monad testnet integration.

- **No price feed.** `get_token_info` reports supply/decimals but no price — no
  reliable source exists for Monad testnet token pricing yet.

## Cut for hackathon scope

Credits/rate-limiting, multi-model routing, NFT search, fund-flow tracing,
validator/staking data, CSV export, pro mode/payments.
