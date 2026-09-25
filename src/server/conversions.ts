import type { ConversionResponse } from "@/lib/api/types";
import { fail, randomId, type ServerResult } from "./result";
import type { ServerState } from "./state";

interface ParsedConversionRequest {
  quoteId: string;
  idempotencyKey: string;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

export function parseConversionRequest(body: unknown): ServerResult<ParsedConversionRequest> {
  if (typeof body !== "object" || body === null || !("quoteId" in body) || !("idempotencyKey" in body)) {
    return fail(400, "INVALID_REQUEST", "Send a JSON body with quoteId and idempotencyKey.");
  }
  const { quoteId, idempotencyKey } = body;
  if (!nonEmptyString(quoteId) || !nonEmptyString(idempotencyKey)) {
    return fail(400, "INVALID_REQUEST", "quoteId and idempotencyKey must be non-empty strings.");
  }
  return { ok: true, status: 200, body: { quoteId, idempotencyKey } };
}

//Every check runs before anything changes, and the update itself has no await in it,
//so a failed request can never move money and two requests can never interleave mid-conversion.
export function executeConversion(
  state: ServerState,
  body: unknown,
  nowMs: number,
  newId: () => string = () => randomId("cv"),
): ServerResult<ConversionResponse> {
  const parsed = parseConversionRequest(body);
  if (!parsed.ok) return parsed;
  const { quoteId, idempotencyKey } = parsed.body;

  //A repeated key returns the original result and never converts twice.
  const previous = state.idempotency.get(idempotencyKey);
  if (previous) {
    if (previous.quoteId !== quoteId) {
      return fail(409, "IDEMPOTENCY_KEY_REUSED", "This idempotency key was already used for a different quote.");
    }
    return { ok: true, status: 201, body: previous };
  }

  const quote = state.quotes.get(quoteId);
  if (!quote) {
    return fail(404, "QUOTE_NOT_FOUND", "We couldn't find this quote. Request a new one.");
  }

  //Debug switch: forces the next conversion to expire, then resets.
  if (state.debug.forceNextConversionExpired) {
    state.debug.forceNextConversionExpired = false;
    return fail(410, "QUOTE_EXPIRED", "This quote has expired. Request a new one.");
  }

  if (nowMs > quote.expiresAtMs) {
    return fail(410, "QUOTE_EXPIRED", "This quote has expired. Request a new one.");
  }

  //A quote can only be used once, even with a different idempotency key.
  if (quote.usedByConversionId !== null) {
    return fail(409, "QUOTE_ALREADY_USED", "This quote has already been used. Request a new one.");
  }

  //Balance may have changed since the quote was issued.
  const totalDebit = quote.sellAmount + quote.fee;
  if (state.balances[quote.sellCurrency] < totalDebit) {
    return fail(422, "INSUFFICIENT_FUNDS", `You no longer have enough ${quote.sellCurrency} for this conversion.`);
  }

  const conversion: ConversionResponse = {
    id: newId(),
    quoteId: quote.id,
    status: "completed",
    sellCurrency: quote.sellCurrency,
    sellAmount: quote.sellAmount.toString(),
    buyCurrency: quote.buyCurrency,
    buyAmount: quote.buyAmount.toString(),
    rate: quote.rate,
    fee: { currency: quote.sellCurrency, amount: quote.fee.toString() },
    createdAt: new Date(nowMs).toISOString(),
  };

  state.balances[quote.sellCurrency] -= totalDebit;
  state.balances[quote.buyCurrency] += quote.buyAmount;
  quote.usedByConversionId = conversion.id;
  state.idempotency.set(idempotencyKey, conversion);
  state.conversions.unshift(conversion);

  return { ok: true, status: 201, body: conversion };
}
