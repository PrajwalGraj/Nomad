"use client";
import { Plus, MessageSquare, Rocket, Box, Users, Trash2, ChevronDown } from "lucide-react";
import { useContacts } from "@/hooks/use-contacts";
import { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import { getTransactionHistory } from "@/lib/tools/read";
import type { ActivityEntry } from "@/lib/tools/types";

export function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const { contacts, addContact, removeContact } = useContacts();
  const { address } = useAccount();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  
  type LocalTx = { hash: string; summary: string; timestamp: number };
  const [localTxs, setLocalTxs] = useState<LocalTx[]>([]);
  
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [name, setName] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState("");
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(true);

  useEffect(() => {
    const loadLocal = () => {
      try {
        const saved = localStorage.getItem("nomad-local-txs-v4");
        if (saved) setLocalTxs(JSON.parse(saved));
      } catch (e) {}
    };
    loadLocal();
    window.addEventListener("nomad-tx-added", loadLocal);
    return () => window.removeEventListener("nomad-tx-added", loadLocal);
  }, []);

  useEffect(() => {
    if (address) {
      setIsLoadingTx(true);
      getTransactionHistory(address, 5).then((card) => {
        setActivity(card.activity);
      }).catch(e => {
        console.error(e);
      }).finally(() => {
        setIsLoadingTx(false);
      });
    } else {
      setActivity([]);
      setLocalTxs([]);
    }
  }, [address]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !addressInput) {
      setError("Please fill in both fields");
      return;
    }
    const success = addContact(name, addressInput);
    if (!success) {
      setError("Invalid wallet address");
      return;
    }
    setName("");
    setAddressInput("");
    setError("");
    setIsOpenModal(false);
  }

  return (
    <aside className={`border-r border-border/80 bg-background/50 flex-col hidden md:flex h-full shrink-0 relative z-30 transition-all duration-300 ease-in-out ${isOpen ? "w-[280px]" : "w-0 overflow-hidden border-r-0 opacity-0"}`}>
      <div className="w-[280px] flex flex-col h-full">
        <div className="p-4 pt-5">
          <button 
            onClick={() => window.dispatchEvent(new Event("nomad-new-chat"))}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-background border border-border/80 text-foreground px-4 py-2.5 text-sm font-medium transition-all shadow-sm hover:shadow-md hover:border-brand/30 group"
          >
            <Plus className="h-4 w-4 text-brand group-hover:scale-110 transition-transform" />
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 space-y-8 pb-4">
          {/* History Block */}
          <div>
            <div className="flex items-center justify-between mb-2 px-3">
              <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
                RECENT ACTIVITY
              </div>
              {isLoadingTx && <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />}
            </div>
            <div className="space-y-0.5">
              {!address ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Connect wallet to see activity.
                </div>
              ) : (() => {
                // Merge local and on-chain transactions, deduplicating by hash
                const allTxs = [
                  ...localTxs.map(t => ({ hash: t.hash, label: t.summary })),
                  ...activity.map(a => ({ hash: a.txHash, label: a.summary }))
                ];
                const uniqueTxs = Array.from(new Map(allTxs.map(item => [item.hash, item])).values()).slice(0, 4);
                
                // Resolve contact names
                const resolvedTxs = uniqueTxs.map(tx => {
                  let resolvedLabel = tx.label;
                  contacts.forEach(c => {
                    // Replace any instance of the address with the contact name
                    const regex = new RegExp(c.address, "gi");
                    resolvedLabel = resolvedLabel.replace(regex, c.name);
                  });
                  // Truncate any remaining 0x addresses
                  resolvedLabel = resolvedLabel.replace(/0x[a-fA-F0-9]{40}/g, (match) => {
                    return `${match.slice(0, 6)}...${match.slice(-4)}`;
                  });
                  return { ...tx, label: resolvedLabel };
                });
                
                if (resolvedTxs.length === 0 && !isLoadingTx) {
                  return (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No recent transfers found.
                    </div>
                  );
                }

                return resolvedTxs.map((tx) => (
                  <a 
                    key={tx.hash}
                    href={`https://testnet.monadexplorer.com/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground/70 hover:bg-muted/80 hover:text-foreground transition-all group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
                      <span className="truncate">{tx.label}</span>
                    </div>
                  </a>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Contacts Block Pushed to Bottom */}
        <div className="px-2 pb-2 mt-auto">
          <div className="flex items-center justify-between mb-1 px-3 group cursor-pointer" onClick={() => setIsContactsOpen(!isContactsOpen)}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isContactsOpen ? "" : "-rotate-90"}`} />
              CONTACTS
            </div>
            <Dialog open={isOpenModal} onOpenChange={setIsOpenModal}>
              <DialogTrigger render={<button onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-brand transition-colors p-1" />}>
                <Plus className="h-4 w-4" />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="flex flex-col gap-3 py-2">
                  <div className="grid gap-2">
                    <Input
                      placeholder="Name (e.g. Alice)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      placeholder="Wallet Address (0x...)"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                    />
                  </div>
                  {error && <span className="text-xs text-destructive font-medium">{error}</span>}
                  <Button type="submit" className="w-full mt-2 bg-brand text-white hover:bg-brand/90">
                    Save Contact
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className={`space-y-0.5 overflow-y-auto transition-all duration-200 ${isContactsOpen ? "max-h-[250px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            {contacts.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No contacts yet.
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between group/contact rounded-lg px-3 py-2 hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      <Users className="h-3 w-3" />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground/80 group-hover/contact:text-foreground">{c.name}</span>
                  </div>
                  <button 
                    onClick={() => removeContact(c.id)}
                    className="opacity-0 group-hover/contact:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border/40">
          <a
            href="https://forms.gle/hDiwCDSvoE1WuRxB8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg bg-brand/10 px-3 py-2.5 text-sm font-medium text-brand transition-all hover:bg-brand/15"
          >
            <Rocket className="h-4 w-4" />
            Join waitlist
          </a>
        </div>
      </div>
    </aside>
  );
}
