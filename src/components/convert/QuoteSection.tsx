"use client";

import { Button } from "@/components/ui/Button";
import { AlertIcon, RefreshIcon } from "@/components/ui/icons";
import { formatMoney } from "@/domain/money";
import { quoteTimeLeftMs, secondsToShow } from "@/domain/quote";
import { useNow } from "@/hooks/useNow";
import type { LockedQuote, QuoteState } from "@/hooks/useQuote";
import { QuotePanel } from "./QuotePanel";

interface QuoteSectionProps {
  state: QuoteState;
  onRefresh: () => void;
}

function shownQuote(state: QuoteState): LockedQuote | null {
  if (state.phase === "ready") return state.quote;
  if (state.phase === "idle") return null;
  return state.previous;
}

//Always mounted, so its live region exists before anything is announced into it.
export function QuoteSection({ state, onRefresh }: QuoteSectionProps) {
  const now = useNow(250);
  const quote = shownQuote(state);
  const msRemaining = quote ? quoteTimeLeftMs(quote, now) : 0;
  const refreshing = state.phase === "requesting";

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement(state, quote, msRemaining)}
      </p>

      {state.phase === "failed" && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-down/30 bg-down-soft p-3 text-sm text-down">
          <AlertIcon className="mt-0.5 shrink-0" />
          {state.error.message}
        </p>
      )}

      {quote && (
        <QuotePanel
          quote={quote}
          comparison={state.phase === "ready" ? state.comparison : null}
          msRemaining={state.phase === "ready" ? msRemaining : 0}
          actions={
            (msRemaining === 0 || state.phase !== "ready") && (
              <Button onClick={onRefresh} loading={refreshing}>
                {!refreshing && <RefreshIcon />}
                {refreshing ? "Getting a new quote…" : "Refresh quote"}
              </Button>
            )
          }
        >
          {msRemaining === 0 && state.phase === "ready" && (
            <p className="mt-3 text-sm font-medium text-down">This quote has expired. Refresh it to get a new rate.</p>
          )}
        </QuotePanel>
      )}
    </>
  );
}

//Changes only at meaningful moments, so screen readers hear each once rather than every tick.
function announcement(state: QuoteState, quote: LockedQuote | null, msRemaining: number): string {
  if (state.phase === "requesting") return "Getting a quote…";
  if (state.phase === "failed") return `Quote failed: ${state.error.message}`;
  if (state.phase !== "ready" || !quote) return "";
  if (msRemaining === 0) return "Your quote has expired. Refresh the quote to get a new rate.";
  if (secondsToShow(msRemaining) <= 10) return "Less than 10 seconds left on your quote.";
  const worse = state.comparison?.worse ? " The new rate is worse than your previous quote." : "";
  return `Quote locked for 30 seconds. You'll receive exactly ${formatMoney(quote.buyAmount, quote.input.buy)}.${worse}`;
}
