import { AppHeader } from "@/components/layout/AppHeader";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import { RatesCard } from "@/components/rates/RatesCard";
import { Card } from "@/components/ui/Card";
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
          <Card id="convert" title="Convert" description="Lock a rate for 30 seconds, then confirm.">
            <SectionPlaceholder rows={4} />
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <RatesCard />
          <Card id="history" title="History" description="Completed conversions, newest first.">
            <SectionPlaceholder rows={3} />
          </Card>
        </div>
      </main>
    </>
  );
}
