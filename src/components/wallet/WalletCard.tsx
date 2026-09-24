"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { RefreshIcon } from "@/components/ui/icons";
import { StateMessage } from "@/components/ui/StateMessage";
import type { Currency } from "@/domain/currency";
import { useBalances } from "@/hooks/useBalances";
import { BalanceList } from "./BalanceList";
import { BalanceListSkeleton } from "./BalanceListSkeleton";
import { PortfolioTotal } from "./PortfolioTotal";

export function WalletCard() {
  const [display, setDisplay] = useState<Currency>("USD");
  const balances = useBalances();

  return (
    <Card
      id="wallet"
      title="Wallet"
      description="Your balance in each currency."
      actions={<CurrencySelect label="Show total in" value={display} onChange={setDisplay} />}
    >
      {balances.data && balances.data.length > 0 && (
        <PortfolioTotal balances={balances.data} display={display} />
      )}
      <BalancesContent balances={balances} />
    </Card>
  );
}


function BalancesContent({ balances }: { balances: ReturnType<typeof useBalances> }) {
  if (balances.isPending) return <BalanceListSkeleton />;

  //Show an error only when there is no data. Keep the last good data if a refresh fails.
  if (balances.isError && !balances.data) {
    return (
      <StateMessage
        kind="error"
        title="We couldn't load your balances"
        description="Check your connection and try again. Your money is safe."
        action={
          <Button
            variant="secondary"
            size="sm"
            loading={balances.isFetching}
            onClick={() => void balances.refetch()}
          >
            {!balances.isFetching && <RefreshIcon />}
            Try again
          </Button>
        }
      />
    );
  }

  if (!balances.data || balances.data.length === 0) {
    return (
      <StateMessage
        kind="empty"
        title="No balances yet"
        description="When you receive money in NGN, USD, GBP, EUR or JPY it will appear here."
      />
    );
  }

  return <BalanceList balances={balances.data} />;
}
