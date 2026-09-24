import type { ReactNode } from "react";
import { AlertIcon } from "@/components/ui/icons";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatMoney } from "@/domain/money";
import type { QuoteComparison } from "@/domain/quote";
import { formatRate } from "@/domain/rates";
import type { LockedQuote } from "@/hooks/useQuote";
import { cx } from "@/lib/cx";
import { QuoteCountdown } from "./QuoteCountdown";

interface QuotePanelProps {
  quote: LockedQuote;
  comparison: QuoteComparison | null;
  msRemaining: number;
  actions: ReactNode;
  children?: ReactNode;
}

export function QuotePanel({ quote, comparison, msRemaining, actions, children }: QuotePanelProps) {
  const { sell, buy } = quote.input;
  const expired = msRemaining === 0;
  const totalMs = Date.parse(quote.expiresAt) - Date.parse(quote.serverTime);

  return (
    <section
      aria-labelledby="quote-heading"
      className={cx("rounded-xl border-2 p-4", expired ? "border-line-strong bg-canvas" : "border-brand bg-brand-soft")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 id="quote-heading" className="font-semibold">
            {expired ? "Quote expired" : "Locked quote"}
          </h3>
          <StatusPill tone={expired ? "danger" : "brand"} className="mt-1">
            {expired ? "Rate no longer guaranteed" : "Rate guaranteed"}
          </StatusPill>
        </div>
        <QuoteCountdown msRemaining={msRemaining} totalMs={totalMs} />
      </div>

      {comparison?.worse && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-warn-line bg-warn-soft p-3 text-sm text-warn">
          <AlertIcon className="mt-0.5 shrink-0" />
          <span>
            <strong>The new rate is worse for you.</strong>{" "}
            {quote.input.fixed.side === "sell"
              ? `You'll receive ${formatMoney(comparison.difference, comparison.currency)} less than your previous quote.`
              : `You'll pay ${formatMoney(comparison.difference, comparison.currency)} more than your previous quote.`}
          </span>
        </p>
      )}

      <div className={cx(expired && "opacity-60")}>
        <p className="text-sm text-ink-muted">You receive exactly</p>
        <p className="text-2xl font-semibold tracking-tight">
          <Money minor={quote.buyAmount} currency={buy} />
        </p>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">You send</dt>
          <dd className="text-right">
            <Money minor={quote.sellAmount} currency={sell} />
          </dd>
          <dt className="text-ink-muted">Fee (0.5%)</dt>
          <dd className="text-right">
            <Money minor={quote.fee} currency={sell} />
          </dd>
          <dt className="text-ink-muted">Total debit</dt>
          <dd className="text-right font-medium">
            <Money minor={quote.sellAmount + quote.fee} currency={sell} />
          </dd>
          <dt className="text-ink-muted">Locked rate</dt>
          <dd className="text-right tabular-nums">
            1 {sell} = {formatRate(quote.rate)} {buy}
          </dd>
        </dl>
      </div>

      {children}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">{actions}</div>
    </section>
  );
}
