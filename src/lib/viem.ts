import { createPublicClient, http } from "viem";
import { monadTestnet } from "./chains";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  // Unfiltered eth_getLogs queries over more than ~200-500 blocks have been
  // observed to hang indefinitely on this RPC rather than error — an explicit
  // timeout + no retries turns that into a catchable failure instead of a
  // stuck request. See README known-issues.
  transport: http(undefined, { timeout: 8_000, retryCount: 0 }),
});
