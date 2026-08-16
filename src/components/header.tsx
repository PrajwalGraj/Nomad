"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold tracking-tight">Nomad</span>
        <span className="text-xs text-muted-foreground">Monad Testnet</span>
      </div>
      <ConnectButton
        showBalance
        chainStatus="icon"
        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
      />
    </header>
  );
}
