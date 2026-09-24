"use client";

import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";
import { Card } from "@/components/ui/Card";
import { useBalances } from "@/hooks/useBalances";
import { BalanceList } from "./BalanceList";
import { BalanceListSkeleton } from "./BalanceListSkeleton";

export function WalletCard() {
  const balances = useBalances();

  return (
    <Card id="wallet" title="Wallet" description="Your balance in each currency.">
      {balances.isPending ? (
        <BalanceListSkeleton />
      ) : balances.data ? (
        <BalanceList balances={balances.data} />
      ) : (
        <SectionPlaceholder rows={5} />
      )}
    </Card>
  );
}
