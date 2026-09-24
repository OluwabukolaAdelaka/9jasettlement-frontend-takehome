"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { AlertIcon, ClockIcon, RefreshIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Currency } from "@/domain/currency";
import { isStale } from "@/domain/freshness";
import { portfolioTotal, type CurrencyAmount } from "@/domain/portfolio";
import { useNow } from "@/hooks/useNow";
import { useRates } from "@/hooks/useRates";
import { formatTime } from "@/lib/formatTime";

interface PortfolioTotalProps {
  balances: readonly CurrencyAmount[];
  display: Currency;
}


export function PortfolioTotal({ balances, display }: PortfolioTotalProps) {
  const rates = useRates(display);
  const now = useNow();

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
  const stale = isStale(rates.dataUpdatedAt, now);

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

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <ClockIcon width={14} height={14} />
          Updated{" "}
          <time dateTime={new Date(rates.dataUpdatedAt).toISOString()}>{formatTime(rates.dataUpdatedAt)}</time>
        </span>
        {/* Always rendered, so screen readers announce the badge when it appears. */}
        <span aria-live="polite">
          {stale && (
            <StatusPill tone="warning" icon={<AlertIcon width={12} height={12} />}>
              Stale: rates may be out of date{rates.isError ? ", retrying…" : ""}
            </StatusPill>
          )}
        </span>
      </div>
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
