"use client";

import { Button } from "@/components/ui/Button";
import { AlertIcon, RefreshIcon } from "@/components/ui/icons";
import { formatMoney } from "@/domain/money";
import { quoteTimeLeftMs, secondsToShow } from "@/domain/quote";
import type { ConfirmState } from "@/hooks/useConfirmConversion";
import { useNow } from "@/hooks/useNow";
import type { LockedQuote, QuoteState } from "@/hooks/useQuote";
import type { ApiError } from "@/lib/api/client";
import { QuotePanel } from "./QuotePanel";

interface QuoteSectionProps {
  state: QuoteState;
  confirmState: ConfirmState;
  onRefresh: () => void;
  onConfirm: (quote: LockedQuote) => void;
}

const SERVER_EXPIRED_MESSAGE =
  "This quote expired before we could confirm it. Nothing was converted and your balances haven't changed. Get a fresh quote to continue.";

const NEEDS_NEW_QUOTE = new Set(["QUOTE_EXPIRED", "QUOTE_ALREADY_USED", "QUOTE_NOT_FOUND"]);

function shownQuote(state: QuoteState): LockedQuote | null {
  if (state.phase === "ready") return state.quote;
  if (state.phase === "idle") return null;
  return state.previous;
}

//Always mounted, so its live region exists before anything is announced into it.
export function QuoteSection({ state, confirmState, onRefresh, onConfirm }: QuoteSectionProps) {
  const now = useNow(250);
  const quote = shownQuote(state);

  const confirmError =
    confirmState.phase === "failed" && quote && confirmState.quoteId === quote.id ? confirmState.error : null;
  const needsNewQuote = confirmError !== null && NEEDS_NEW_QUOTE.has(confirmError.code);
  const msRemaining = quote && state.phase === "ready" && !needsNewQuote ? quoteTimeLeftMs(quote, now) : 0;
  const expired = msRemaining === 0;
  const refreshing = state.phase === "requesting";
  const confirming = confirmState.phase === "submitting";
  const blocked = confirmError?.code === "INSUFFICIENT_FUNDS";

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement(state, confirmState, confirmError, quote, msRemaining)}
      </p>

      {state.phase === "failed" && <ErrorNote>{state.error.message}</ErrorNote>}

      {quote && (
        <QuotePanel
          quote={quote}
          comparison={state.phase === "ready" ? state.comparison : null}
          msRemaining={msRemaining}
          actions={
            expired ? (
              <Button onClick={onRefresh} loading={refreshing}>
                {!refreshing && <RefreshIcon />}
                {refreshing ? "Getting a new quote…" : needsNewQuote ? "Get a fresh quote" : "Refresh quote"}
              </Button>
            ) : (
              <Button size="lg" onClick={() => onConfirm(quote)} loading={confirming} disabled={blocked}>
                {confirming ? "Confirming…" : confirmError ? "Try again" : "Confirm conversion"}
              </Button>
            )
          }
        >
          {confirmError && (
            <ErrorNote className="mt-3">
              {confirmError.code === "QUOTE_EXPIRED" ? SERVER_EXPIRED_MESSAGE : confirmError.message}
            </ErrorNote>
          )}
          {expired && !needsNewQuote && state.phase === "ready" && (
            <p className="mt-3 text-sm font-medium text-down">This quote has expired. Refresh it to get a new rate.</p>
          )}
        </QuotePanel>
      )}
    </>
  );
}

function ErrorNote({ children, className }: { children: string; className?: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-lg border border-down/30 bg-down-soft p-3 text-sm text-down ${className ?? ""}`}
    >
      <AlertIcon className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

//Changes only at meaningful moments, so screen readers hear each once rather than every tick.
function announcement(
  state: QuoteState,
  confirmState: ConfirmState,
  confirmError: ApiError | null,
  quote: LockedQuote | null,
  msRemaining: number,
): string {
  if (state.phase === "requesting") return "Getting a quote…";
  if (state.phase === "failed") return `Quote failed: ${state.error.message}`;
  if (state.phase !== "ready" || !quote) return "";
  if (confirmState.phase === "submitting") return "Confirming your conversion…";
  if (confirmError) return confirmError.code === "QUOTE_EXPIRED" ? SERVER_EXPIRED_MESSAGE : confirmError.message;
  if (msRemaining === 0) return "Your quote has expired. Refresh the quote to get a new rate.";
  if (secondsToShow(msRemaining) <= 10) return "Less than 10 seconds left on your quote.";
  const worse = state.comparison?.worse ? " The new rate is worse than your previous quote." : "";
  return `Quote locked for 30 seconds. You'll receive exactly ${formatMoney(quote.buyAmount, quote.input.buy)}.${worse}`;
}
