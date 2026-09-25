"use client";

import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/Button";
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
import { useConfirmConversion } from "@/hooks/useConfirmConversion";
import { useConversionEstimate } from "@/hooks/useConversionEstimate";
import { useQuote } from "@/hooks/useQuote";
import { AmountField } from "./AmountField";
import { ConversionComplete } from "./ConversionComplete";
import { CurrencyPair } from "./CurrencyPair";
import { EstimateSummary } from "./EstimateSummary";
import { AMOUNT_TOO_SMALL_MESSAGE, draftErrorMessage, shortfallMessage } from "./messages";
import { QuoteSection } from "./QuoteSection";

const INITIAL_VALUES: ConvertFormValues = { sell: "USD", buy: "NGN", side: "sell", amountText: "" };

export function ConvertCard() {
  const [values, setValues] = useState<ConvertFormValues>(INITIAL_VALUES);
  const draft = parseDraft(values);
  const { rates, estimate } = useConversionEstimate(values.sell, draft.ok ? draft.input : null);
  const balances = useBalances();
  const quote = useQuote();
  const confirm = useConfirmConversion();
  //After a receipt the form remounts; put the keyboard user straight back in the amount field.
  const [returningFromReceipt, setReturningFromReceipt] = useState(false);

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

  const showingQuote =
    quote.state.phase === "ready" ||
    ((quote.state.phase === "requesting" || quote.state.phase === "failed") && quote.state.previous !== null);
  const canRequestQuote = draft.ok && amountError === null && quote.state.phase !== "requesting";

  const edit = (change: (current: ConvertFormValues) => ConvertFormValues) => {
    setValues(change);
    quote.reset();
    confirm.reset();
  };
  const update = (patch: Partial<ConvertFormValues>) => edit((current) => ({ ...current, ...patch }));

  const swap = () =>
    edit((current) => ({
      ...current,
      sell: current.buy,
      buy: current.sell,
      side: current.side === "sell" ? "buy" : "sell",
    }));

  //Switching send/receive pre-fills the other side from the estimate, so the conversion stays the same size.
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

  const requestQuote = () => {
    if (!draft.ok || !canRequestQuote) return;
    confirm.reset();
    void quote.request(draft.input);
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!showingQuote) requestQuote();
  };

  const startOver = () => {
    confirm.reset();
    quote.reset();
    setValues((current) => ({ ...current, amountText: "" }));
    setReturningFromReceipt(true);
  };

  if (confirm.state.phase === "done") {
    return (
      <Card id="convert" title="Convert" description="Lock a rate for 30 seconds, then confirm.">
        <ConversionComplete receipt={confirm.state.receipt} onNewConversion={startOver} />
      </Card>
    );
  }

  return (
    <Card id="convert" title="Convert" description="Lock a rate for 30 seconds, then confirm.">
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        {/* Inputs are locked while confirming, so the quote being confirmed can't change underneath it. */}
        <fieldset disabled={confirm.state.phase === "submitting"} className="flex min-w-0 flex-col gap-5">
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
            focusOnMount={returningFromReceipt}
          />
        </fieldset>

        {!showingQuote && (
          <>
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
            <Button
              type="submit"
              size="lg"
              fullWidth
              disabled={!canRequestQuote}
              loading={quote.state.phase === "requesting"}
            >
              {quote.state.phase === "requesting" ? "Getting your quote…" : "Get quote"}
            </Button>
          </>
        )}

        <QuoteSection
          state={quote.state}
          confirmState={confirm.state}
          onRefresh={requestQuote}
          onConfirm={(locked) => void confirm.confirm(locked)}
        />
      </form>
    </Card>
  );
}
