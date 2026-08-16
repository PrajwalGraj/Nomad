// Uniswap V2-style router interface — the common denominator most Monad
// testnet DEXes (Kuru, Uniswap-v4-derived routers with a v2-compat shim, etc.)
// expose in some form. NOT VERIFIED against a live Monad DEX deployment —
// set DEX_ROUTER_ADDRESS once you've confirmed which router to target and
// swap this ABI out if that DEX uses a different interface (e.g. Uniswap v4's
// singleton + PoolManager pattern instead of a per-pair router).
export const routerAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactETHForTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export const DEX_ROUTER_ADDRESS = process.env.DEX_ROUTER_ADDRESS as `0x${string}` | undefined;
// Canonical wrapped-native address for the router's WETH-equivalent (WMON), if the
// DEX requires routing native swaps through a wrapped token. Unverified — confirm
// against the chosen DEX's docs.
export const WRAPPED_NATIVE_ADDRESS = process.env.WRAPPED_NATIVE_ADDRESS as `0x${string}` | undefined;
