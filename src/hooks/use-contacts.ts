"use client";

import { useState, useEffect } from "react";
import { type Address, isAddress } from "viem";

export type Contact = {
  id: string;
  name: string;
  address: Address;
};

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("nomad-contacts");
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const addContact = (name: string, address: string) => {
    if (!isAddress(address)) return false;
    const newContact: Contact = { id: crypto.randomUUID(), name, address };
    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem("nomad-contacts", JSON.stringify(updated));
    return true;
  };

  const removeContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    localStorage.setItem("nomad-contacts", JSON.stringify(updated));
  };

  return { contacts, addContact, removeContact };
}
