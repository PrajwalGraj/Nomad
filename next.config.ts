import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RainbowKit's Coinbase/Base Account connector transitively pulls in
  // @coinbase/cdp-sdk, which does string-based dynamic imports of optional
  // @x402/* payment packages we don't install and never invoke. Excluding
  // these from server bundling stops Next's build-time resolver from
  // failing on them.
  serverExternalPackages: ["@coinbase/cdp-sdk", "@base-org/account"],
};

export default nextConfig;
