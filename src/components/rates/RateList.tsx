import { CURRENCIES, CURRENCY_NAMES, type Currency } from "@/domain/currency";
import { formatRate } from "@/domain/rates";
import type { RateBoard } from "@/hooks/useRateBoard";
import { DirectionIndicator } from "./DirectionIndicator";

interface RateListProps {
  base: Currency;
  board: RateBoard;
}


export function RateList({ base, board }: RateListProps) {
  const quoteCurrencies = CURRENCIES.filter((currency) => currency !== base);

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {quoteCurrencies.map((currency) => {
        const rate = board.rates[currency];
        return (
          <li key={currency} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold text-brand"
              >
                {currency}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{CURRENCY_NAMES[currency]}</p>
                <p className="text-xs text-ink-muted">
                  {base} → {currency}
                </p>
              </div>
            </div>

            
            {rate ? (
              <div className="flex items-center gap-2">
                <DirectionIndicator direction={board.directions[currency] ?? "unchanged"} />
                <p className="text-right">
                  <span className="block font-semibold tabular-nums">{formatRate(rate)}</span>
                  <span className="block text-xs text-ink-muted">
                    {currency} per 1 {base}
                  </span>
                </p>
              </div>
            ) : (
              <span className="text-sm text-ink-muted">Rate unavailable</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
