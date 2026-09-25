import type { Currency } from "@/domain/currency";
import { formatMoney } from "@/domain/money";
import { cx } from "@/lib/cx";

interface MoneyProps {
  minor: bigint;
  currency: Currency;
  className?: string;
}

//One formatter for every amount on screen, so quote, receipt and history can never disagree.
export function Money({ minor, currency, className }: MoneyProps) {
  return <span className={cx("tabular-nums", className)}>{formatMoney(minor, currency)}</span>;
}
