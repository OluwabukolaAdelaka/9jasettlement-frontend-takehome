import type { ReactNode } from "react";
import { FreshnessStatus } from "@/components/ui/FreshnessStatus";
import { Money } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import type { AmountSide } from "@/domain/convertForm";
import type { Currency } from "@/domain/currency";
import type { EstimateResult } from "@/domain/pricing";
import { formatRate } from "@/domain/rates";

interface EstimateSummaryProps {
  sell: Currency;
  buy: Currency;
  side: AmountSide;
  hasValidAmount: boolean;
  estimate: EstimateResult | undefined;
  ratesLoading: boolean;
  ratesUpdatedAt: number;
  ratesRetrying: boolean;
}

export function EstimateSummary({
  sell,
  buy,
  side,
  hasValidAmount,
  estimate,
  ratesLoading,
  ratesUpdatedAt,
  ratesRetrying,
}: EstimateSummaryProps) {
  if (!hasValidAmount) {
    return <Frame>Enter an amount to see an estimate.</Frame>;
  }
  if (!estimate) {
    return ratesLoading ? (
      <Frame>
        <span className="sr-only">Fetching the live rate…</span>
        <Skeleton className="h-6 w-40" />
      </Frame>
    ) : (
      <Frame>The live rate is unavailable right now. You can still request a quote.</Frame>
    );
  }
  if (!estimate.ok) {
    return estimate.reason === "rate_unavailable" ? (
      <Frame>The live rate is unavailable right now. You can still request a quote.</Frame>
    ) : null;
  }

  const { priced } = estimate;
  return (
    <section aria-label="Estimate" className="rounded-xl border border-dashed border-line-strong bg-canvas p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <StatusPill tone="neutral">Estimate</StatusPill>
        <FreshnessStatus updatedAt={ratesUpdatedAt} retrying={ratesRetrying} />
      </div>

      <p className="text-sm text-ink-muted">{side === "sell" ? "You'd receive about" : "You'd send about"}</p>
      <p className="text-2xl font-semibold tracking-tight">
        ≈ {side === "sell" ? <Money minor={priced.buyAmount} currency={buy} /> : <Money minor={priced.sellAmount} currency={sell} />}
      </p>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-muted">Rate</dt>
        <dd className="text-right tabular-nums">
          1 {sell} ≈ {formatRate(priced.rate)} {buy}
        </dd>
        <dt className="text-ink-muted">Fee (0.5%)</dt>
        <dd className="text-right">
          <Money minor={priced.fee} currency={sell} />
        </dd>
        <dt className="text-ink-muted">Total debit</dt>
        <dd className="text-right font-medium">
          <Money minor={priced.totalDebit} currency={sell} />
        </dd>
      </dl>

      <p className="mt-3 text-xs text-ink-muted">
        Based on the live rate. The exact amount is locked when you get a quote.
      </p>
    </section>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-canvas p-4 text-sm text-ink-muted">
      {children}
    </div>
  );
}
