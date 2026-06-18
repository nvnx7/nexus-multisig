import { BrandPanel } from "@/components/brand-panel";
import { WalletPanel } from "@/components/wallet-panel";
import { WalletProvider } from "@/context/wallet-context";

export default function Home() {
  return (
    <WalletProvider>
      <main className="flex h-screen overflow-hidden">
        <BrandPanel />
        <WalletPanel />
      </main>
    </WalletProvider>
  );
}
