"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
          </span>
          <span className="text-gradient-brand font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Nomad
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            Monad Testnet
          </span>
        </div>
        <ConnectButton
          showBalance
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </header>
  );
}
