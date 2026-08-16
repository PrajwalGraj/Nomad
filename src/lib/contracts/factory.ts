export const nomadTokenFactoryAbi = [
  {
    type: "function",
    name: "launchToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "totalSupply", type: "uint256" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "allTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "event",
    name: "TokenLaunched",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
    ],
  },
] as const;

// Nomad's own deployed factory on Monad testnet — public info (a contract address,
// not a secret), safe to bake in as a default so deployments work without extra
// config. NOMAD_FACTORY_ADDRESS still overrides it if you deploy your own instance.
const DEFAULT_FACTORY_ADDRESS = "0x526F54924b8675f6D15e114C48F830a6a418e408";

export const FACTORY_ADDRESS = (process.env.NOMAD_FACTORY_ADDRESS || DEFAULT_FACTORY_ADDRESS) as `0x${string}`;
