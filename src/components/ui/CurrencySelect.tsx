"use client";

import { useId } from "react";
import { CURRENCIES, CURRENCY_NAMES, type Currency, isCurrency } from "@/domain/currency";
import { cx } from "@/lib/cx";
import { ChevronDownIcon } from "./icons";

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
    <div className={cx("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className={cx("text-sm font-medium text-ink-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
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
            "h-10 w-full min-w-0 appearance-none truncate rounded-lg border bg-surface pl-3 pr-9 text-sm font-medium disabled:bg-canvas disabled:text-ink-muted",
            invalid ? "border-down" : "border-line-strong",
          )}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency} · {CURRENCY_NAMES[currency]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted" />
      </div>
    </div>
  );
}
