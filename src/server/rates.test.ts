import Big from "big.js";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import { driftRates, ratesAgainst, ratesResponse } from "./rates";

describe("driftRates", () => {
  it("never moves a rate by more than 0.5% per request", () => {
    const usdRates = createInitialState().usdRates;
    for (const random of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const before = usdRates.NGN;
      driftRates(usdRates, () => random);
      const change = usdRates.NGN.div(before).minus(1).abs();
      expect(change.lte("0.005")).toBe(true);
    }
  });

  it("moves down at the low end and up at the high end", () => {
    const low = driftRates(createInitialState().usdRates, () => 0);
    const high = driftRates(createInitialState().usdRates, () => 0.999999);
    expect(low.NGN.lt("1532.4512")).toBe(true);
    expect(high.NGN.gt("1532.4512")).toBe(true);
  });

  it("keeps USD fixed at 1", () => {
    expect(driftRates(createInitialState().usdRates, () => 0).USD.eq(1)).toBe(true);
  });
});

describe("ratesAgainst", () => {
  const usdRates = { NGN: new Big(1500), USD: new Big(1), GBP: new Big("0.75"), EUR: new Big("0.8"), JPY: new Big(150) };

  it("returns USD rates as 8-dp strings, without the base", () => {
    expect(ratesAgainst(usdRates, "USD")).toEqual({
      NGN: "1500.00000000",
      GBP: "0.75000000",
      EUR: "0.80000000",
      JPY: "150.00000000",
    });
  });

  it("re-bases onto another currency", () => {
    expect(ratesAgainst(usdRates, "EUR")).toEqual({
      NGN: "1875.00000000",
      USD: "1.25000000",
      GBP: "0.93750000",
      JPY: "187.50000000",
    });
  });
});

describe("ratesResponse", () => {
  it("matches the API contract", () => {
    const response = ratesResponse(createInitialState().usdRates, "USD", new Date("2026-09-24T10:15:05.000Z"));
    expect(response).toEqual({
      base: "USD",
      rates: { NGN: "1532.45120000", GBP: "0.74210000", EUR: "0.85430000", JPY: "147.82000000" },
      timestamp: "2026-09-24T10:15:05.000Z",
    });
  });
});
