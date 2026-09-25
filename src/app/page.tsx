import { AppHeader } from "@/components/layout/AppHeader";
import { ConvertCard } from "@/components/convert/ConvertCard";
import { HistoryCard } from "@/components/history/HistoryCard";
import { RatesCard } from "@/components/rates/RatesCard";
import { WalletCard } from "@/components/wallet/WalletCard";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 py-6 sm:gap-6 sm:px-6 lg:grid-cols-2 lg:py-8"
      >
        <h1 className="sr-only">Swapr wallet</h1>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <WalletCard />
          <ConvertCard />
        </div>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <RatesCard />
          <HistoryCard />
        </div>
      </main>
    </>
  );
}
