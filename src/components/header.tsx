"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PanelLeft } from "lucide-react";

export function Header({ toggleSidebar }: { toggleSidebar?: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          {toggleSidebar && (
            <button 
              onClick={toggleSidebar}
              className="hidden md:flex p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          )}
          <span className="text-gradient-brand font-heading text-2xl font-bold tracking-tight sm:text-3xl pr-2">
            Nomad
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
            Monad Testnet
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectButton
            showBalance
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>
      </div>
    </header>
  );
}
