import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "./chains";

// walletconnect projectId is optional for local/demo use but RainbowKit warns without one.
// Get a free one at https://cloud.reown.com if WalletConnect-based wallets are needed.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Nomad",
  projectId: walletConnectProjectId,
  chains: [monadTestnet],
  ssr: true,
});
