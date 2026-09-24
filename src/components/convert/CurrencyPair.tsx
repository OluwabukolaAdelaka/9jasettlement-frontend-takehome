"use client";

import { useId } from "react";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { SwapIcon } from "@/components/ui/icons";
import type { Currency } from "@/domain/currency";

interface CurrencyPairProps {
  sell: Currency;
  buy: Currency;
  onSellChange: (currency: Currency) => void;
  onBuyChange: (currency: Currency) => void;
  onSwap: () => void;
  error: string | null;
}

export function CurrencyPair({ sell, buy, onSellChange, onBuyChange, onSwap, error }: CurrencyPairProps) {
  const errorId = useId();
  const invalid = error !== null;

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <CurrencySelect
          label="From"
          value={sell}
          onChange={onSellChange}
          invalid={invalid}
          describedBy={invalid ? errorId : undefined}
        />
        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap currencies"
          className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <SwapIcon className="rotate-90" />
        </button>
        <CurrencySelect
          label="To"
          value={buy}
          onChange={onBuyChange}
          invalid={invalid}
          describedBy={invalid ? errorId : undefined}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-down">
          {error}
        </p>
      )}
    </div>
  );
}
