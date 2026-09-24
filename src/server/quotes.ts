import { type Currency, isCurrency } from "@/domain/currency";
import { midRate, priceConversion, type FixedAmount } from "@/domain/pricing";
import type { QuoteResponse } from "@/lib/api/types";
import { ratesAgainst } from "./rates";
import { fail, randomId, type ServerResult } from "./result";
import type { ServerState, StoredQuote } from "./state";

export const QUOTE_TTL_MS = 30_000;

const POSITIVE_INTEGER = /^[1-9]\d*$/;

interface ParsedQuoteRequest {
  sell: Currency;
  buy: Currency;
  fixed: FixedAmount;
}

function field(body: object, key: string): unknown {
  return key in body ? (body as Record<string, unknown>)[key] : undefined;
}

//Validates the request and requires exactly one positive integer amount.
export function parseQuoteRequest(body: unknown): ServerResult<ParsedQuoteRequest> {
  if (typeof body !== "object" || body === null) {
    return fail(400, "INVALID_REQUEST", "Send a JSON body with sellCurrency, buyCurrency and an amount.");
  }

  const sell = field(body, "sellCurrency");
  const buy = field(body, "buyCurrency");
  if (!isCurrency(sell) || !isCurrency(buy)) {
    return fail(400, "INVALID_REQUEST", "sellCurrency and buyCurrency must be one of NGN, USD, GBP, EUR or JPY.");
  }
  if (sell === buy) {
    return fail(400, "SAME_CURRENCY", "You can't convert a currency to itself.");
  }

  const sellAmount = field(body, "sellAmount");
  const buyAmount = field(body, "buyAmount");
  if ((sellAmount === undefined) === (buyAmount === undefined)) {
    return fail(400, "INVALID_REQUEST", "Provide exactly one of sellAmount or buyAmount.");
  }

  const amount = sellAmount ?? buyAmount;
  if (typeof amount !== "string" || !POSITIVE_INTEGER.test(amount)) {
    return fail(400, "INVALID_REQUEST", "Amounts must be positive whole numbers in minor units, as strings.");
  }

  const side = sellAmount !== undefined ? "sell" : "buy";
  return { ok: true, status: 200, body: { sell, buy, fixed: { side, amount: BigInt(amount) } } };
}

export function toQuoteResponse(quote: StoredQuote, nowMs: number): QuoteResponse {
  return {
    id: quote.id,
    sellCurrency: quote.sellCurrency,
    buyCurrency: quote.buyCurrency,
    sellAmount: quote.sellAmount.toString(),
    buyAmount: quote.buyAmount.toString(),
    rate: quote.rate,
    fee: { currency: quote.sellCurrency, amount: quote.fee.toString() },
    expiresAt: new Date(quote.expiresAtMs).toISOString(),
    serverTime: new Date(nowMs).toISOString(),
  };
}


//Prices at the current mid-market rate with spread and fee, 
//checks the balance, and locks the result for 30 seconds.

export function createQuote(
  state: ServerState,
  body: unknown,
  nowMs: number,
  newId: () => string = () => randomId("qt"),
): ServerResult<QuoteResponse> {
  const parsed = parseQuoteRequest(body);
  if (!parsed.ok) return parsed;
  const { sell, buy, fixed } = parsed.body;

  const mid = midRate(ratesAgainst(state.usdRates, "USD"), "USD", sell, buy);
  const price = priceConversion(mid, sell, buy, fixed);
  if (!price.ok) {
    return fail(422, "AMOUNT_TOO_SMALL", "This amount is too small to convert. Try a larger amount.");
  }

  const { priced } = price;
  if (priced.totalDebit > state.balances[sell]) {
    return fail(422, "INSUFFICIENT_FUNDS", `You don't have enough ${sell} for this conversion, including the fee.`);
  }

  const quote: StoredQuote = {
    id: newId(),
    sellCurrency: sell,
    buyCurrency: buy,
    sellAmount: priced.sellAmount,
    buyAmount: priced.buyAmount,
    rate: priced.rate,
    fee: priced.fee,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + QUOTE_TTL_MS,
    usedByConversionId: null,
  };
  state.quotes.set(quote.id, quote);

  return { ok: true, status: 201, body: toQuoteResponse(quote, nowMs) };
}
