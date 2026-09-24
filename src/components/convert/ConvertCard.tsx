"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  amountCurrency,
  findShortfall,
  parseDraft,
  type AmountSide,
  type ConvertFormValues,
} from "@/domain/convertForm";
import { minorToMajorString } from "@/domain/money";
import { useBalances } from "@/hooks/useBalances";
import { useConversionEstimate } from "@/hooks/useConversionEstimate";
import { AmountField } from "./AmountField";
import { CurrencyPair } from "./CurrencyPair";
import { EstimateSummary } from "./EstimateSummary";
import { AMOUNT_TOO_SMALL_MESSAGE, draftErrorMessage, shortfallMessage } from "./messages";

const INITIAL_VALUES: ConvertFormValues = { sell: "USD", buy: "NGN", side: "sell", amountText: "" };

export function ConvertCard() {
  const [values, setValues] = useState<ConvertFormValues>(INITIAL_VALUES);
  const draft = parseDraft(values);
  const { rates, estimate } = useConversionEstimate(values.sell, draft.ok ? draft.input : null);
  const balances = useBalances();

  const available = balances.data?.find((balance) => balance.currency === values.sell)?.minor;
  const shortfall =
    estimate?.ok && available !== undefined ? findShortfall(estimate.priced, values.sell, available) : null;

  const pairError = !draft.ok && draft.error.kind === "same_currency" ? draftErrorMessage(draft.error) : null;
  const amountError =
    !draft.ok && draft.error.kind !== "same_currency"
      ? draftErrorMessage(draft.error)
      : estimate && !estimate.ok && estimate.reason === "amount_too_small"
        ? AMOUNT_TOO_SMALL_MESSAGE
        : shortfall
          ? shortfallMessage(shortfall)
          : null;

  const update = (patch: Partial<ConvertFormValues>) => setValues((current) => ({ ...current, ...patch }));

  const swap = () =>
    setValues((current) => ({
      ...current,
      sell: current.buy,
      buy: current.sell,
      side: current.side === "sell" ? "buy" : "sell",
    }));

  const changeSide = (side: AmountSide) => {
    if (side === values.side) return;
    const counterpart =
      estimate?.ok && side === "buy"
        ? minorToMajorString(estimate.priced.buyAmount, values.buy)
        : estimate?.ok && side === "sell"
          ? minorToMajorString(estimate.priced.sellAmount, values.sell)
          : values.amountText;
    update({ side, amountText: counterpart });
  };

  return (
    <Card id="convert" title="Convert" description="Lock a rate for 30 seconds, then confirm.">
      <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()} noValidate>
        <CurrencyPair
          sell={values.sell}
          buy={values.buy}
          onSellChange={(sell) => update({ sell })}
          onBuyChange={(buy) => update({ buy })}
          onSwap={swap}
          error={pairError}
        />
        <AmountField
          side={values.side}
          currency={amountCurrency(values)}
          amountText={values.amountText}
          onSideChange={changeSide}
          onAmountChange={(amountText) => update({ amountText })}
          error={amountError}
          sellCurrency={values.sell}
          available={available}
        />
        <EstimateSummary
          sell={values.sell}
          buy={values.buy}
          side={values.side}
          hasValidAmount={draft.ok}
          estimate={estimate}
          ratesLoading={rates.isPending}
          ratesUpdatedAt={rates.dataUpdatedAt}
          ratesRetrying={rates.failureCount > 0}
        />
      </form>
    </Card>
  );
}
