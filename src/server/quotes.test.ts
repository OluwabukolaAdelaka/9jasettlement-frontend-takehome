import Big from "big.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createQuote, QUOTE_TTL_MS } from "./quotes";
import { createInitialState, type ServerState } from "./state";

const NOW = Date.parse("2026-09-24T10:15:05.000Z");

//Round rates: 1 USD = ₦1500 = €0.8 = £0.75 = ¥150. Starting USD balance is $2,500.75.
function testState(): ServerState {
  const state = createInitialState();
  state.usdRates = { NGN: new Big(1500), USD: new Big(1), GBP: new Big("0.75"), EUR: new Big("0.8"), JPY: new Big(150) };
  return state;
}

let state: ServerState;
beforeEach(() => {
  state = testState();
});

const quote = (body: unknown) => createQuote(state, body, NOW, () => "qt_test");

describe("createQuote", () => {
  it("prices a fixed sell amount with 0.5% spread and 0.5% fee on top", () => {
    const result = quote({ sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "10000" });
    expect(result).toEqual({
      ok: true,
      status: 201,
      body: {
        id: "qt_test",
        sellCurrency: "USD",
        buyCurrency: "NGN",
        sellAmount: "10000",
        buyAmount: "14925000",
        rate: "1492.50000000",
        fee: { currency: "USD", amount: "50" },
        expiresAt: "2026-09-24T10:15:35.000Z",
        serverTime: "2026-09-24T10:15:05.000Z",
      },
    });
  });

  it("prices a fixed buy amount", () => {
    const result = quote({ sellCurrency: "USD", buyCurrency: "NGN", buyAmount: "14925000" });
    expect(result.ok && result.body).toMatchObject({ sellAmount: "10000", buyAmount: "14925000" });
  });

  it("locks the quote for exactly 30 seconds and stores it", () => {
    quote({ sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "10000" });
    const stored = state.quotes.get("qt_test");
    expect(stored?.expiresAtMs).toBe(NOW + QUOTE_TTL_MS);
    expect(stored?.usedByConversionId).toBeNull();
  });

  it("allows converting the whole balance when sell + fee fits exactly", () => {
    //248,831 + 1,245 fee = 250,076, which exceeds the 250,075 balance.
    //248,830 + 1,245 fee = 250,075, so it fits exactly.
    const result = quote({ sellCurrency: "USD", buyCurrency: "EUR", sellAmount: "248830" });
    expect(result.ok).toBe(true);
  });

  it("rejects with 422 INSUFFICIENT_FUNDS when sell + fee exceeds the balance", () => {
    const result = quote({ sellCurrency: "USD", buyCurrency: "EUR", sellAmount: "248831" });
    expect(result).toMatchObject({ ok: false, status: 422, code: "INSUFFICIENT_FUNDS" });
    expect(state.quotes.size).toBe(0);
  });

  it("rejects selling a currency with a zero balance", () => {
    expect(quote({ sellCurrency: "GBP", buyCurrency: "USD", sellAmount: "100" })).toMatchObject({
      status: 422,
      code: "INSUFFICIENT_FUNDS",
    });
  });

  it("rejects converting a currency to itself", () => {
    expect(quote({ sellCurrency: "USD", buyCurrency: "USD", sellAmount: "100" })).toMatchObject({
      status: 400,
      code: "SAME_CURRENCY",
    });
  });

  it("rejects amounts too small to produce anything", () => {
    //¥1 converts to less than 1 USD minor unit, so the result rounds to 0.
    expect(quote({ sellCurrency: "JPY", buyCurrency: "USD", sellAmount: "1" })).toMatchObject({
      status: 422,
      code: "AMOUNT_TOO_SMALL",
    });
  });

  it.each([
    ["both amounts", { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "100", buyAmount: "100" }],
    ["no amount", { sellCurrency: "USD", buyCurrency: "NGN" }],
    ["a decimal amount", { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "10.50" }],
    ["a zero amount", { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "0" }],
    ["a negative amount", { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "-100" }],
    ["a number instead of a string", { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: 100 }],
    ["an unknown currency", { sellCurrency: "BTC", buyCurrency: "NGN", sellAmount: "100" }],
    ["no body", null],
  ])("rejects %s with 400 INVALID_REQUEST", (_, body) => {
    expect(quote(body)).toMatchObject({ ok: false, status: 400, code: "INVALID_REQUEST" });
  });
});
