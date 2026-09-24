import type { Currency } from "@/domain/currency";
import { formatMoney } from "@/domain/money";
import { cx } from "@/lib/cx";

interface MoneyProps {
  minor: bigint;
  currency: Currency;
  className?: string;
}

//Frmats all amounts the same way across the app.
export function Money({ minor, currency, className }: MoneyProps) {
  return <span className={cx("tabular-nums", className)}>{formatMoney(minor, currency)}</span>;
}
