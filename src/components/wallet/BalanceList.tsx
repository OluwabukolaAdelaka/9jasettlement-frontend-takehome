import { CURRENCY_NAMES } from "@/domain/currency";
import type { Balance } from "@/hooks/useBalances";
import { Money } from "@/components/ui/Money";
import { cx } from "@/lib/cx";


export function BalanceList({ balances }: { balances: Balance[] }) {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {balances.map((balance) => {
        const isZero = balance.minor === 0n;
        return (
          <li key={balance.currency} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-semibold text-brand"
              >
                {balance.currency}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{CURRENCY_NAMES[balance.currency]}</p>
                <p className="text-xs text-ink-muted">
                  <span className="sr-only">Currency code </span>
                  {balance.currency}
                </p>
              </div>
            </div>
            <Money
              minor={balance.minor}
              currency={balance.currency}
              className={cx("text-right font-semibold", isZero && "text-ink-muted")}
            />
          </li>
        );
      })}
    </ul>
  );
}
