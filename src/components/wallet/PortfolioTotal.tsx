"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FreshnessStatus } from "@/components/ui/FreshnessStatus";
import { AlertIcon, RefreshIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Currency } from "@/domain/currency";
import { portfolioTotal, type CurrencyAmount } from "@/domain/portfolio";
import { useRates } from "@/hooks/useRates";

interface PortfolioTotalProps {
  balances: readonly CurrencyAmount[];
  display: Currency;
}

export function PortfolioTotal({ balances, display }: PortfolioTotalProps) {
  const rates = useRates(display);

  if (rates.isPending) {
    return (
      <TotalFrame display={display}>
        <div role="status">
          <span className="sr-only">Loading total…</span>
          <Skeleton className="mt-1 h-9 w-48" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
      </TotalFrame>
    );
  }

  if (!rates.data) {
    return (
      <TotalFrame display={display}>
        <p role="alert" className="mt-1 flex items-center gap-1.5 text-sm font-medium text-down">
          <AlertIcon /> Total unavailable: rates couldn&apos;t be loaded.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          loading={rates.isFetching}
          onClick={() => void rates.refetch()}
        >
          {!rates.isFetching && <RefreshIcon />}
          Try again
        </Button>
      </TotalFrame>
    );
  }

  const result = portfolioTotal(balances, display, rates.data.rates, rates.data.base);

  return (
    <TotalFrame display={display}>
      {result.ok ? (
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          <Money minor={result.total} currency={display} />
        </p>
      ) : (
        <p className="mt-1 text-sm font-medium text-down">
          Total unavailable: missing rate for {result.missingRates.join(", ")}.
        </p>
      )}

      <FreshnessStatus className="mt-2" updatedAt={rates.dataUpdatedAt} retrying={rates.failureCount > 0} />
    </TotalFrame>
  );
}

function TotalFrame({ display, children }: { display: Currency; children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl bg-brand-soft p-4">
      <p className="text-sm text-ink-muted">Total value in {display}</p>
      {children}
      <p className="mt-2 text-xs text-ink-muted">Estimated at mid-market rates.</p>
    </div>
  );
}
