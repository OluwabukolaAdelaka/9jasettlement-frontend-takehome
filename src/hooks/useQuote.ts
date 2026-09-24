"use client";

import { useRef, useState } from "react";
import { parseMinor } from "@/domain/money";
import {
  compareQuotes,
  estimateClockOffsetMs,
  isSameConversionInput,
  type ConversionInput,
  type QuoteComparison,
} from "@/domain/quote";
import { ApiError, createQuote } from "@/lib/api/client";
import type { CreateQuoteRequest, QuoteResponse } from "@/lib/api/types";

export interface LockedQuote {
  id: string;
  input: ConversionInput;
  sellAmount: bigint;
  buyAmount: bigint;
  rate: string;
  fee: bigint;
  expiresAt: string;
  serverTime: string;
  clockOffsetMs: number;
}

export type QuoteState =
  | { phase: "idle" }
  | { phase: "requesting"; previous: LockedQuote | null }
  | { phase: "ready"; quote: LockedQuote; comparison: QuoteComparison | null }
  | { phase: "failed"; error: ApiError; previous: LockedQuote | null };

function toRequest({ sell, buy, fixed }: ConversionInput): CreateQuoteRequest {
  const amount = fixed.amount.toString();
  return fixed.side === "sell"
    ? { sellCurrency: sell, buyCurrency: buy, sellAmount: amount }
    : { sellCurrency: sell, buyCurrency: buy, buyAmount: amount };
}

function toLockedQuote(response: QuoteResponse, input: ConversionInput, clockOffsetMs: number): LockedQuote {
  return {
    id: response.id,
    input,
    sellAmount: parseMinor(response.sellAmount),
    buyAmount: parseMinor(response.buyAmount),
    rate: response.rate,
    fee: parseMinor(response.fee.amount),
    expiresAt: response.expiresAt,
    serverTime: response.serverTime,
    clockOffsetMs,
  };
}

function lastQuote(state: QuoteState): LockedQuote | null {
  if (state.phase === "ready") return state.quote;
  if (state.phase === "idle") return null;
  return state.previous;
}

export function useQuote() {
  const [state, setState] = useState<QuoteState>({ phase: "idle" });
  //Bumped on every request and reset, so a late response for old inputs is ignored.
  const latestRequest = useRef(0);

  async function request(input: ConversionInput) {
    const requestId = ++latestRequest.current;
    const last = lastQuote(state);
    //Only a refresh of the same inputs is compared with the previous quote.
    const previous = last && isSameConversionInput(last.input, input) ? last : null;
    setState({ phase: "requesting", previous });

    const sentAt = Date.now();
    try {
      const response = await createQuote(toRequest(input));
      const clockOffsetMs = estimateClockOffsetMs(response.serverTime, sentAt, Date.now());
      if (requestId !== latestRequest.current) return;

      const quote = toLockedQuote(response, input, clockOffsetMs);
      const comparison = previous
        ? compareQuotes(previous, quote, input.fixed.side, input.sell, input.buy)
        : null;
      setState({ phase: "ready", quote, comparison });
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      const apiError =
        error instanceof ApiError ? error : new ApiError(0, "UNKNOWN_ERROR", "Something went wrong. Please try again.");
      setState({ phase: "failed", error: apiError, previous });
    }
  }

  function reset() {
    latestRequest.current++;
    setState({ phase: "idle" });
  }

  return { state, request, reset };
}
