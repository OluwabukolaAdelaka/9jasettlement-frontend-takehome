import { describe, expect, it } from "vitest";
import {
  compareQuotes,
  estimateClockOffsetMs,
  isQuoteExpired,
  isSameConversionInput,
  quoteMsRemaining,
  quoteTimeLeftMs,
  secondsToShow,
  type ConversionInput,
} from "./quote";

const SERVER_TIME = "2026-09-24T10:15:05.000Z";
const EXPIRES_AT = "2026-09-24T10:15:35.000Z"; //30 s later
const SERVER_MS = Date.parse(SERVER_TIME);

describe("estimateClockOffsetMs", () => {
  it("is zero when clocks agree (server stamped at the round-trip midpoint)", () => {
    expect(estimateClockOffsetMs(SERVER_TIME, SERVER_MS - 500, SERVER_MS + 500)).toBe(0);
  });

  it("measures a client clock that is 5 minutes behind the server", () => {
    const clientMs = SERVER_MS - 300_000;
    expect(estimateClockOffsetMs(SERVER_TIME, clientMs - 400, clientMs + 400)).toBe(300_000);
  });

  it("cancels out network latency using the midpoint", () => {
    //Request took 1.2 s; the server stamped its time 600 ms after we sent it.
    expect(estimateClockOffsetMs(SERVER_TIME, SERVER_MS - 600, SERVER_MS + 600)).toBe(0);
  });
});

describe("quoteMsRemaining", () => {
  it("is the full 30 s when the quote has just arrived", () => {
    expect(quoteMsRemaining(EXPIRES_AT, 0, SERVER_MS)).toBe(30_000);
  });

  it("counts down with real time", () => {
    expect(quoteMsRemaining(EXPIRES_AT, 0, SERVER_MS + 12_345)).toBe(17_655);
  });

  it("is correct straight after the tab was backgrounded or the device slept", () => {
    expect(quoteMsRemaining(EXPIRES_AT, 0, SERVER_MS + 45_000)).toBe(0);
  });

  it("uses server time, so a wrong client clock does not change the countdown", () => {
    const offset = 300_000; //client is 5 min behind
    const clientNow = SERVER_MS - offset + 10_000; //10 s after the quote, by the client's clock
    expect(quoteMsRemaining(EXPIRES_AT, offset, clientNow)).toBe(20_000);
  });

  it("never goes negative", () => {
    expect(quoteMsRemaining(EXPIRES_AT, 0, SERVER_MS + 3_600_000)).toBe(0);
  });

  it("throws on an invalid timestamp instead of treating it as valid", () => {
    expect(() => quoteMsRemaining("not a date", 0, SERVER_MS)).toThrow();
  });
});

describe("quoteTimeLeftMs", () => {
  const timing = { expiresAt: EXPIRES_AT, serverTime: SERVER_TIME, clockOffsetMs: 0 };

  it("never shows more than the quote's 30 s lifetime, even with a clock reading from before it arrived", () => {
    expect(quoteTimeLeftMs(timing, SERVER_MS - 800)).toBe(30_000);
  });

  it("otherwise matches the time remaining", () => {
    expect(quoteTimeLeftMs(timing, SERVER_MS + 5_000)).toBe(25_000);
    expect(quoteTimeLeftMs(timing, SERVER_MS + 40_000)).toBe(0);
  });
});

describe("isQuoteExpired", () => {
  it("is valid 1 ms before expiry", () => {
    expect(isQuoteExpired(EXPIRES_AT, 0, SERVER_MS + 29_999)).toBe(false);
  });

  it("is expired exactly at expiresAt", () => {
    expect(isQuoteExpired(EXPIRES_AT, 0, SERVER_MS + 30_000)).toBe(true);
  });
});

describe("secondsToShow", () => {
  it("rounds up so the display only reaches 0 at expiry", () => {
    expect(secondsToShow(30_000)).toBe(30);
    expect(secondsToShow(29_001)).toBe(30);
    expect(secondsToShow(29_000)).toBe(29);
    expect(secondsToShow(1)).toBe(1);
    expect(secondsToShow(0)).toBe(0);
  });
});

describe("isSameConversionInput", () => {
  const input: ConversionInput = { sell: "USD", buy: "NGN", fixed: { side: "sell", amount: 10000n } };

  it("matches identical inputs", () => {
    expect(isSameConversionInput(input, { ...input, fixed: { side: "sell", amount: 10000n } })).toBe(true);
  });

  it.each<[string, ConversionInput]>([
    ["amount", { ...input, fixed: { side: "sell", amount: 10001n } }],
    ["side", { ...input, fixed: { side: "buy", amount: 10000n } }],
    ["sell currency", { ...input, sell: "GBP" }],
    ["buy currency", { ...input, buy: "EUR" }],
  ])("detects a change in %s", (_, changed) => {
    expect(isSameConversionInput(input, changed)).toBe(false);
  });
});

describe("compareQuotes", () => {
  const previous = { sellAmount: 10000n, buyAmount: 15247889n, fee: 50n };

  describe("fixed sell amount", () => {
    it("is worse when the user would receive less", () => {
      const next = { ...previous, buyAmount: 15200000n };
      expect(compareQuotes(previous, next, "sell", "USD", "NGN")).toEqual({
        worse: true,
        currency: "NGN",
        difference: 47889n,
      });
    });

    it("is not worse when the user would receive the same or more", () => {
      expect(compareQuotes(previous, previous, "sell", "USD", "NGN")).toEqual({ worse: false });
      expect(compareQuotes(previous, { ...previous, buyAmount: 15300000n }, "sell", "USD", "NGN")).toEqual({
        worse: false,
      });
    });
  });

  describe("fixed buy amount", () => {
    it("is worse when the user would pay more in total (sell + fee)", () => {
      const next = { sellAmount: 10040n, buyAmount: previous.buyAmount, fee: 51n };
      expect(compareQuotes(previous, next, "buy", "USD", "NGN")).toEqual({
        worse: true,
        currency: "USD",
        difference: 41n,
      });
    });

    it("is not worse when the user would pay less", () => {
      const next = { sellAmount: 9990n, buyAmount: previous.buyAmount, fee: 50n };
      expect(compareQuotes(previous, next, "buy", "USD", "NGN")).toEqual({ worse: false });
    });
  });
});
