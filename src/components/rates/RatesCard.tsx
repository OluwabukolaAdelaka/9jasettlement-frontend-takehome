"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { RefreshIcon } from "@/components/ui/icons";
import { StateMessage } from "@/components/ui/StateMessage";
import type { Currency } from "@/domain/currency";
import { useRateBoard } from "@/hooks/useRateBoard";
import { RateList } from "./RateList";
import { RateListSkeleton } from "./RateListSkeleton";

export function RatesCard() {
  const [base, setBase] = useState<Currency>("USD");

  return (
    <Card
      id="rates"
      title="Live rates"
      description="Mid-market rates, refreshed every 5 seconds."
      actions={<CurrencySelect label="Base currency" value={base} onChange={setBase} />}
    >
      <RatesContent base={base} />
    </Card>
  );
}


function RatesContent({ base }: { base: Currency }) {
  const { query, board } = useRateBoard(base);

  if (board) return <RateList base={base} board={board} />;

  if (query.isError) {
    return (
      <StateMessage
        kind="error"
        title="We couldn't load live rates"
        description="We'll keep retrying automatically. You can also try now."
        action={
          <Button variant="secondary" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
            {!query.isFetching && <RefreshIcon />}
            Try again
          </Button>
        }
      />
    );
  }

  return <RateListSkeleton />;
}
