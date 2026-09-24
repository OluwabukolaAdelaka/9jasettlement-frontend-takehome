import Big from "big.js";
import { beforeEach, describe, expect, it } from "vitest";
import { executeConversion } from "./conversions";
import { createQuote } from "./quotes";
import { createInitialState, type ServerState } from "./state";

const NOW = Date.parse("2026-09-24T10:15:05.000Z");

let state: ServerState;
let nextId = 0;
const ids = (prefix: string) => () => `${prefix}_${++nextId}`;

beforeEach(() => {
  nextId = 0;
  state = createInitialState();
  state.usdRates = { NGN: new Big(1500), USD: new Big(1), GBP: new Big("0.75"), EUR: new Big("0.8"), JPY: new Big(150) };
});

//$100 -> ₦149,250.00, fee $0.50. Returns the quote id.
function quoteUsdToNgn(sellAmount = "10000"): string {
  const result = createQuote(state, { sellCurrency: "USD", buyCurrency: "NGN", sellAmount }, NOW, ids("qt"));
  if (!result.ok) throw new Error("quote failed");
  return result.body.id;
}

const convert = (quoteId: string, idempotencyKey: string, atMs = NOW + 10_000) =>
  executeConversion(state, { quoteId, idempotencyKey }, atMs, ids("cv"));

const balances = () => ({ ...state.balances });

describe("executeConversion", () => {
  it("debits sell + fee, credits buy, and returns exactly the quoted amounts", () => {
    const quoteId = quoteUsdToNgn();
    const before = balances();

    const result = convert(quoteId, "key-1");

    expect(result).toEqual({
      ok: true,
      status: 201,
      body: {
        id: "cv_2",
        quoteId,
        status: "completed",
        sellCurrency: "USD",
        sellAmount: "10000",
        buyCurrency: "NGN",
        buyAmount: "14925000",
        rate: "1492.50000000",
        fee: { currency: "USD", amount: "50" },
        createdAt: "2026-09-24T10:15:15.000Z",
      },
    });
    expect(state.balances.USD).toBe(before.USD - 10050n);
    expect(state.balances.NGN).toBe(before.NGN + 14925000n);
    expect(state.balances.EUR).toBe(before.EUR);
  });

  it("adds conversions to history, newest first", () => {
    convert(quoteUsdToNgn("10000"), "key-1");
    convert(quoteUsdToNgn("20000"), "key-2");
    expect(state.conversions.map((c) => c.sellAmount)).toEqual(["20000", "10000"]);
  });

  describe("idempotency", () => {
    it("returns the original result for a repeated key and never converts twice", () => {
      const quoteId = quoteUsdToNgn();
      const first = convert(quoteId, "key-1");
      const afterFirst = balances();

      const second = convert(quoteId, "key-1");

      expect(second).toEqual(first);
      expect(balances()).toEqual(afterFirst);
      expect(state.conversions).toHaveLength(1);
    });

    it("returns the original result even after the quote has expired", () => {
      const quoteId = quoteUsdToNgn();
      const first = convert(quoteId, "key-1");
      expect(convert(quoteId, "key-1", NOW + 60_000)).toEqual(first);
    });

    it("refuses to reuse a key for a different quote", () => {
      convert(quoteUsdToNgn(), "key-1");
      const afterFirst = balances();
      expect(convert(quoteUsdToNgn(), "key-1")).toMatchObject({ status: 409, code: "IDEMPOTENCY_KEY_REUSED" });
      expect(balances()).toEqual(afterFirst);
    });

    it("never uses the same quote twice, even with a different key", () => {
      const quoteId = quoteUsdToNgn();
      convert(quoteId, "key-1");
      const afterFirst = balances();
      expect(convert(quoteId, "key-2")).toMatchObject({ status: 409, code: "QUOTE_ALREADY_USED" });
      expect(balances()).toEqual(afterFirst);
    });
  });

  describe("expiry", () => {
    it("accepts the quote up to and including expiresAt", () => {
      expect(convert(quoteUsdToNgn(), "key-1", NOW + 30_000).ok).toBe(true);
    });

    it("returns 410 QUOTE_EXPIRED once server time is past expiresAt, and balances do not change", () => {
      const quoteId = quoteUsdToNgn();
      const before = balances();
      expect(convert(quoteId, "key-1", NOW + 30_001)).toMatchObject({ status: 410, code: "QUOTE_EXPIRED" });
      expect(balances()).toEqual(before);
      expect(state.conversions).toHaveLength(0);
    });

    it("lets the user retry with a fresh quote after an expiry", () => {
      convert(quoteUsdToNgn(), "key-1", NOW + 31_000);
      expect(convert(quoteUsdToNgn(), "key-2").ok).toBe(true);
    });
  });

  describe("debug: force next conversion expired", () => {
    it("fails exactly once with 410, without touching balances", () => {
      state.debug.forceNextConversionExpired = true;
      const quoteId = quoteUsdToNgn();
      const before = balances();

      expect(convert(quoteId, "key-1")).toMatchObject({ status: 410, code: "QUOTE_EXPIRED" });
      expect(balances()).toEqual(before);
      expect(state.debug.forceNextConversionExpired).toBe(false);

      //The flag was one-shot; a fresh quote converts normally.
      expect(convert(quoteUsdToNgn(), "key-2").ok).toBe(true);
    });
  });

  it("returns 422 INSUFFICIENT_FUNDS if the balance dropped after the quote was issued", () => {
    const first = quoteUsdToNgn("200000"); //$2,000
    const second = quoteUsdToNgn("200000"); //$2,000 again: fine at quote time ($2,500.75)
    convert(first, "key-1");
    const afterFirst = balances();

    expect(convert(second, "key-2")).toMatchObject({ status: 422, code: "INSUFFICIENT_FUNDS" });
    expect(balances()).toEqual(afterFirst);
  });

  it("returns 404 for an unknown quote", () => {
    expect(convert("qt_missing", "key-1")).toMatchObject({ status: 404, code: "QUOTE_NOT_FOUND" });
  });

  it.each([
    ["no body", null],
    ["missing key", { quoteId: "qt_1" }],
    ["empty key", { quoteId: "qt_1", idempotencyKey: "  " }],
  ])("rejects %s with 400", (_, body) => {
    expect(executeConversion(state, body, NOW)).toMatchObject({ status: 400, code: "INVALID_REQUEST" });
  });
});
