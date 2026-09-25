import Big from "big.js";
import { beforeEach, describe, expect, it } from "vitest";
import { executeConversion } from "./conversions";
import { createQuote } from "./quotes";
import { decodeSession, encodeSession, MAX_CONVERSIONS, MAX_COOKIE_VALUE_LENGTH } from "./session";
import { createInitialState, type ServerState } from "./state";

const NOW = Date.parse("2026-09-24T10:15:05.000Z");

let state: ServerState;
let nextId = 0;
beforeEach(() => {
  nextId = 0;
  state = createInitialState();
  state.usdRates = { NGN: new Big(1500), USD: new Big(1), GBP: new Big("0.75"), EUR: new Big("0.8"), JPY: new Big(150) };
});

function convert(sellAmount: string, key: string, atMs = NOW) {
  const quote = createQuote(state, { sellCurrency: "USD", buyCurrency: "NGN", sellAmount }, atMs, () => `qt_${++nextId}`);
  if (!quote.ok) throw new Error("quote failed");
  return executeConversion(state, { quoteId: quote.body.id, idempotencyKey: key }, atMs + 1_000, () => `cv_${++nextId}`);
}

//The decoded wallet, merged back with the market rates, as a route would use it.
const roundTrip = (value: string): ServerState => {
  const session = decodeSession(value);
  if (!session) throw new Error("did not decode");
  return { ...session, usdRates: state.usdRates };
};

describe("session cookie", () => {
  it("round-trips balances, history, quotes, debug switches and the session id", () => {
    convert("10000", "key-1");
    state.debug.ratesOutage = true;

    const restored = roundTrip(encodeSession(state, NOW));

    expect(restored.sessionId).toBe(state.sessionId);
    expect(restored.balances).toEqual(state.balances);
    expect(restored.conversions).toEqual(state.conversions);
    expect([...restored.quotes.values()]).toEqual([...state.quotes.values()]);
    expect(restored.debug).toEqual({ ratesOutage: true, forceNextConversionExpired: false });
  });

  it("keeps idempotency working after a round trip: the same key never converts twice", () => {
    const first = convert("10000", "key-1");
    const restored = roundTrip(encodeSession(state, NOW));
    const quoteId = first.ok ? first.body.quoteId : "";

    const repeat = executeConversion(restored, { quoteId, idempotencyKey: "key-1" }, NOW + 2_000);

    expect(repeat).toEqual(first);
    expect(restored.balances).toEqual(state.balances);
  });

  it("keeps a used quote single-use after a round trip", () => {
    const first = convert("10000", "key-1");
    const restored = roundTrip(encodeSession(state, NOW));
    const quoteId = first.ok ? first.body.quoteId : "";

    expect(executeConversion(restored, { quoteId, idempotencyKey: "key-2" }, NOW + 2_000)).toMatchObject({
      status: 409,
      code: "QUOTE_ALREADY_USED",
    });
  });

  it("rejects a cookie whose data was edited (for example to raise a balance)", () => {
    const value = encodeSession(state, NOW);
    const [data, signature] = value.split(".");
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as { b: Record<string, string> };
    payload.b.USD = "999999999";
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;

    expect(decodeSession(forged)).toBeNull();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["garbage", "not-a-session"],
    ["a bad signature", `${encodeSession(createInitialState(), NOW).split(".")[0]}.AAAA`],
  ])("treats a %s cookie as no session", (_, value) => {
    expect(decodeSession(value)).toBeNull();
  });

  it(`keeps only the newest ${MAX_CONVERSIONS} conversions`, () => {
    for (let i = 1; i <= MAX_CONVERSIONS + 5; i++) convert("100", `key-${i}`, NOW + i * 10_000);

    const restored = roundTrip(encodeSession(state, NOW + 200_000));

    expect(restored.conversions).toHaveLength(MAX_CONVERSIONS);
    expect(restored.conversions[0]).toEqual(state.conversions[0]);
  });

  it("drops quotes a minute past expiry but keeps recent ones", () => {
    createQuote(state, { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "100" }, NOW, () => "qt_old");
    createQuote(state, { sellCurrency: "USD", buyCurrency: "NGN", sellAmount: "100" }, NOW + 80_000, () => "qt_new");

    const restored = roundTrip(encodeSession(state, NOW + 100_000));

    expect([...restored.quotes.keys()]).toEqual(["qt_new"]);
  });

  it("stays under the browser cookie size limit with a full history and several quotes", () => {
    //Big balances and amounts make every stored number as long as it realistically gets.
    state.balances.USD = 999_999_999_999_999n;
    for (let i = 1; i <= 30; i++) convert("12345678901", crypto.randomUUID(), NOW + i * 1_000);
    for (let i = 0; i < 5; i++) {
      createQuote(state, { sellCurrency: "USD", buyCurrency: "JPY", sellAmount: "999" }, NOW + 40_000, () => `qt_${crypto.randomUUID()}`);
    }

    expect(encodeSession(state, NOW + 40_000).length).toBeLessThanOrEqual(MAX_COOKIE_VALUE_LENGTH);
  });
});
