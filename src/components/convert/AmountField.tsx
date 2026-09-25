"use client";

import { useEffect, useId, useRef } from "react";
import { Money } from "@/components/ui/Money";
import type { AmountSide } from "@/domain/convertForm";
import { type Currency, MINOR_DIGITS } from "@/domain/currency";
import { cx } from "@/lib/cx";

interface AmountFieldProps {
  side: AmountSide;
  currency: Currency;
  amountText: string;
  onSideChange: (side: AmountSide) => void;
  onAmountChange: (text: string) => void;
  error: string | null;
  sellCurrency: Currency;
  available: bigint | undefined;
  focusOnMount?: boolean;
}

const SIDES: { value: AmountSide; label: string }[] = [
  { value: "sell", label: "Send" },
  { value: "buy", label: "Receive" },
];

export function AmountField({
  side,
  currency,
  amountText,
  onSideChange,
  onAmountChange,
  error,
  sellCurrency,
  available,
  focusOnMount = false,
}: AmountFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const helpId = useId();
  const sideName = useId();
  const label = side === "sell" ? "You send" : "You receive";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink-muted">Enter the amount you</legend>
        <div className="inline-flex rounded-lg border border-line-strong bg-canvas p-0.5">
          {SIDES.map((option) => (
            <label key={option.value} className="relative">
              <input
                type="radio"
                name={sideName}
                value={option.value}
                checked={side === option.value}
                onChange={() => onSideChange(option.value)}
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-muted">
          {label} ({currency})
        </label>
        <div className="relative">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            inputMode={MINOR_DIGITS[currency] === 0 ? "numeric" : "decimal"}
            autoComplete="off"
            spellCheck={false}
            placeholder={MINOR_DIGITS[currency] === 0 ? "0" : "0.00"}
            value={amountText}
            onChange={(event) => onAmountChange(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={cx(error && errorId, helpId)}
            className={cx(
              "h-12 w-full rounded-lg border bg-surface pl-3 pr-14 text-lg font-semibold tabular-nums",
              error ? "border-down" : "border-line-strong",
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-ink-muted"
          >
            {currency}
          </span>
        </div>
        {/* Always mounted, so screen readers announce an error when it appears, not only when the field is revisited. */}
        <div aria-live="polite">
          {error && (
            <p id={errorId} className="text-sm text-down">
              {error}
            </p>
          )}
        </div>
        <p id={helpId} className="text-xs text-ink-muted">
          Available:{" "}
          {available === undefined ? "…" : <Money minor={available} currency={sellCurrency} className="font-medium" />}
        </p>
      </div>
    </div>
  );
}
