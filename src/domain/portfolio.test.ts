import { describe, expect, it } from "vitest";
import { portfolioTotal, type CurrencyAmount } from "./portfolio";

//Uses simple numbers so totals are easy to check.
const RATES_USD = { NGN: "1500", EUR: "0.8", GBP: "0.75", JPY: "150" };

const BALANCES: CurrencyAmount[] = [
  { currency: "USD", minor: 10000n }, //$100
  { currency: "NGN", minor: 150000n }, //₦1,500 = $1
  { currency: "EUR", minor: 8000n }, //€80 = $100
  { currency: "JPY", minor: 1500n }, //¥1,500 = $10
  { currency: "GBP", minor: 0n },
];

describe("portfolioTotal", () => {
  it("sums every balance in the base currency", () => {
    expect(portfolioTotal(BALANCES, "USD", RATES_USD, "USD")).toEqual({ ok: true, total: 21100n });
  });

  it("converts the total into a non-base display currency", () => {
    //$211 × 1500 = ₦316,500
    expect(portfolioTotal(BALANCES, "NGN", RATES_USD, "USD")).toEqual({ ok: true, total: 31650000n });
  });

  it("uses 0 decimals when the display currency is JPY", () => {
    //$211 × 150 = ¥31,650
    expect(portfolioTotal(BALANCES, "JPY", RATES_USD, "USD")).toEqual({ ok: true, total: 31650n });
  });

  it("works with rates against the display currency itself", () => {
    const ratesNgn = { USD: "0.00066667", EUR: "0.00053333" };
    const result = portfolioTotal([{ currency: "NGN", minor: 12345n }], "NGN", ratesNgn, "NGN");
    expect(result).toEqual({ ok: true, total: 12345n });
  });

  it("rounds once at the end, not per balance", () => {
    //$0.01 = ¥1.5 and €0.01 = ¥1.875. Rounded per row: 2 + 2 = 4. Rounded once: 3.375 -> 3.
    const tiny: CurrencyAmount[] = [
      { currency: "USD", minor: 1n },
      { currency: "EUR", minor: 1n },
    ];
    expect(portfolioTotal(tiny, "JPY", RATES_USD, "USD")).toEqual({ ok: true, total: 3n });
  });

  it("rounds half up to the display currency's minor unit", () => {
    //$0.01 = ¥1.5 -> ¥2
    expect(portfolioTotal([{ currency: "USD", minor: 1n }], "JPY", RATES_USD, "USD")).toEqual({
      ok: true,
      total: 2n,
    });
  });

  it("does not lose precision on very large balances", () => {
    const huge: CurrencyAmount[] = [{ currency: "NGN", minor: 900719925474099300n }];
    //₦9,007,199,254,740,993.00 / 1500 = $6,004,799,503,160.662 -> 600479950316066 cents
    expect(portfolioTotal(huge, "USD", RATES_USD, "USD")).toEqual({ ok: true, total: 600479950316066n });
  });

  it("reports which rates are missing instead of guessing", () => {
    const result = portfolioTotal(BALANCES, "USD", { NGN: "1500", EUR: "0.8" }, "USD");
    expect(result).toEqual({ ok: false, missingRates: ["JPY"] });
  });

  it("does not need a rate for a zero balance", () => {
    //GBP is 0 and has no rate: still fine.
    const result = portfolioTotal(BALANCES, "USD", { NGN: "1500", EUR: "0.8", JPY: "150" }, "USD");
    expect(result).toEqual({ ok: true, total: 21100n });
  });

  it("returns zero for an empty wallet", () => {
    expect(portfolioTotal([], "EUR", RATES_USD, "USD")).toEqual({ ok: true, total: 0n });
  });
});
