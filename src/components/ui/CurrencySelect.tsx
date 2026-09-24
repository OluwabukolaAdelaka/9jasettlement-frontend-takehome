"use client";

import { useId } from "react";
import { CURRENCIES, CURRENCY_NAMES, type Currency, isCurrency } from "@/domain/currency";
import { cx } from "@/lib/cx";

interface CurrencySelectProps {
  label: string;
  value: Currency;
  onChange: (currency: Currency) => void;
  hideLabel?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

export function CurrencySelect({
  label,
  value,
  onChange,
  hideLabel = false,
  disabled,
  invalid = false,
  describedBy,
  className,
}: CurrencySelectProps) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className={cx("text-sm font-medium text-ink-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          if (isCurrency(event.target.value)) onChange(event.target.value);
        }}
        className={cx(
          "h-10 rounded-lg border bg-surface pl-3 pr-8 text-sm font-medium disabled:bg-canvas disabled:text-ink-muted",
          invalid ? "border-down" : "border-line-strong",
        )}
      >
        {CURRENCIES.map((currency) => (
          <option key={currency} value={currency}>
            {currency} · {CURRENCY_NAMES[currency]}
          </option>
        ))}
      </select>
    </div>
  );
}
