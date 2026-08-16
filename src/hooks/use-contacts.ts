"use client";

import { useState, useEffect } from "react";
import { type Address, isAddress } from "viem";

export type Contact = {
  id: string;
  name: string;
  address: Address;
};

const STORAGE_KEY = "nomad-contacts";
// useContacts() is called independently in several components (Sidebar, Chat,
// MessageInput) — each gets its own useState, so a plain localStorage write in one
// doesn't reach the others. Broadcasting this event (same pattern as nomad-tx-added /
// nomad-new-chat elsewhere in the app) keeps every mounted instance in sync, e.g. so
// a contact added via the sidebar shows up immediately in MessageInput's @ dropdown.
const CHANGE_EVENT = "nomad-contacts-changed";

function readContacts(): Contact[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function writeContacts(contacts: Contact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>(() => (typeof window === "undefined" ? [] : readContacts()));

  useEffect(() => {
    const sync = () => setContacts(readContacts());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const addContact = (name: string, address: string) => {
    if (!isAddress(address)) return false;
    writeContacts([...readContacts(), { id: crypto.randomUUID(), name, address }]);
    return true;
  };

  const removeContact = (id: string) => {
    writeContacts(readContacts().filter((c) => c.id !== id));
  };

  return { contacts, addContact, removeContact };
}
