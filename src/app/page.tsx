"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Chat } from "@/components/chat/chat";
import { Sidebar } from "@/components/sidebar";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen min-h-0 bg-background">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Chat />
      </div>
    </div>
  );
}
