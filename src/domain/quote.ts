import type { Currency } from "./currency";
import type { FixedAmount } from "./pricing";

//Calculates quote timing from the server clock instead of a countdown.
//Recalculates from Date.now() so it stays accurate after sleep or backgrounding.

function parseIsoMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: "${iso}"`);
  return ms;
}

//Estimates the server/client clock difference using the request midpoint to reduce the effect of network latency.
export function estimateClockOffsetMs(
  serverTimeIso: string,
  requestSentAtMs: number,
  responseReceivedAtMs: number,
): number {
  const clientMidpoint = requestSentAtMs + (responseReceivedAtMs - requestSentAtMs) / 2;
  return parseIsoMs(serverTimeIso) - clientMidpoint;
}

export function quoteMsRemaining(expiresAtIso: string, clockOffsetMs: number, nowMs: number): number {
  return Math.max(0, parseIsoMs(expiresAtIso) - (nowMs + clockOffsetMs));
}

export interface QuoteTiming {
  expiresAt: string;
  serverTime: string;
  clockOffsetMs: number;
}

//Never more than the quote's lifetime: a clock reading from just before the quote arrived would otherwise show 31s.
export function quoteTimeLeftMs(quote: QuoteTiming, nowMs: number): number {
  const lifetimeMs = parseIsoMs(quote.expiresAt) - parseIsoMs(quote.serverTime);
  return Math.min(lifetimeMs, quoteMsRemaining(quote.expiresAt, quote.clockOffsetMs, nowMs));
}

export function isQuoteExpired(expiresAtIso: string, clockOffsetMs: number, nowMs: number): boolean {
  return quoteMsRemaining(expiresAtIso, clockOffsetMs, nowMs) === 0;
}

//Rounds up so 0s only appears after expiry.
export function secondsToShow(msRemaining: number): number {
  return Math.ceil(msRemaining / 1000);
}

export interface ConversionInput {
  sell: Currency;
  buy: Currency;
  fixed: FixedAmount;
}

//A quote is valid only for the exact inputs it was issued for.
export function isSameConversionInput(a: ConversionInput, b: ConversionInput): boolean {
  return (
    a.sell === b.sell &&
    a.buy === b.buy &&
    a.fixed.side === b.fixed.side &&
    a.fixed.amount === b.fixed.amount
  );
}

export interface QuoteAmounts {
  sellAmount: bigint;
  buyAmount: bigint;
  fee: bigint;
}

export type QuoteComparison =
  | { worse: false }
  | { worse: true; currency: Currency; difference: bigint };

  //Compares a refreshed quote from the user's point of view.
  //A fixed sell is worse if they receive less; a fixed buy is worse if they pay more.
export function compareQuotes(
  previous: QuoteAmounts,
  next: QuoteAmounts,
  fixedSide: FixedAmount["side"],
  sell: Currency,
  buy: Currency,
): QuoteComparison {
  if (fixedSide === "sell") {
    const difference = previous.buyAmount - next.buyAmount;
    return difference > 0n ? { worse: true, currency: buy, difference } : { worse: false };
  }
  const difference = next.sellAmount + next.fee - (previous.sellAmount + previous.fee);
  return difference > 0n ? { worse: true, currency: sell, difference } : { worse: false };
}
