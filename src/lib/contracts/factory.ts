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

// Set once contracts/script/DeployFactory.s.sol has been broadcast to Monad testnet.
export const FACTORY_ADDRESS = process.env.NOMAD_FACTORY_ADDRESS as `0x${string}` | undefined;
