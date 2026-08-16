import { Header } from "@/components/header";
import { Chat } from "@/components/chat/chat";

export default function Home() {
  return (
    <div className="flex h-screen min-h-0 flex-col">
      <Header />
      <Chat />
    </div>
  );
}
