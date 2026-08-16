import { defineChain } from "viem";

// chainId/RPC verified live via `cast chain-id`/`cast block-number` against the
// real RPC (currently around block 52.7M+). Multicall3's canonical address was
// confirmed deployed here via `cast code` — without declaring it, viem's
// publicClient.multicall() throws ChainDoesNotSupportContract instead of using it.
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: true,
});
