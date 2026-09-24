import Big from "big.js";
import { describe, expect, it } from "vitest";
import {
  applySpread,
  buyToSellMinor,
  computeFee,
  midRate,
  priceConversion,
  sellToBuyMinor,
} from "./pricing";

describe("computeFee", () => {
  it("is 0.5% of the sell amount", () => {
    expect(computeFee(10000n)).toBe(50n); //$100.00 -> $0.50 (the brief's example)
  });

  it("rounds up to the next minor unit", () => {
    expect(computeFee(201n)).toBe(2n); //1.005 -> 2
    expect(computeFee(123456789n)).toBe(617284n); //617283.945 -> 617284
  });

  it("does not round up an exact result", () => {
    expect(computeFee(400n)).toBe(2n);
  });

  it("charges at least 1 minor unit", () => {
    expect(computeFee(1n)).toBe(1n);
    expect(computeFee(199n)).toBe(1n);
  });
});

describe("midRate", () => {
  const ratesUsd = { NGN: "1500", EUR: "0.8" };

  it("returns the rate directly against the base", () => {
    expect(midRate(ratesUsd, "USD", "USD", "NGN").toFixed(8)).toBe("1500.00000000");
  });

  it("crosses two non-base currencies", () => {
    expect(midRate(ratesUsd, "USD", "EUR", "NGN").toFixed(8)).toBe("1875.00000000");
  });

  it("inverts the base rate, rounded to 8 dp", () => {
    expect(midRate(ratesUsd, "USD", "NGN", "USD").toFixed(8)).toBe("0.00066667");
  });

  it("throws on a missing rate instead of guessing", () => {
    expect(() => midRate(ratesUsd, "USD", "USD", "JPY")).toThrow();
  });
});

describe("applySpread", () => {
  it("makes the rate 0.5% worse for the user", () => {
    expect(applySpread(new Big("1532.4512")).toFixed(8)).toBe("1524.78894400");
    expect(applySpread(new Big("1")).toFixed(8)).toBe("0.99500000");
  });

  it("rounds down at the 8th decimal", () => {
    //0.00066667 × 0.995 = 0.00066333665 -> 0.00066333
    expect(applySpread(new Big("0.00066667")).toFixed(8)).toBe("0.00066333");
  });
});

describe("sellToBuyMinor", () => {
  it("matches the brief's example", () => {
    //$100.00 at 1524.789 -> ₦152,478.90
    expect(sellToBuyMinor(10000n, new Big("1524.789"), "USD", "NGN")).toBe(15247890n);
  });

  it("rounds down when converting into JPY (0 decimals)", () => {
    //$100.00 at 147.82 = ¥14,782 exactly; $1.00 at 147.82 = ¥147.82 -> ¥147
    expect(sellToBuyMinor(10000n, new Big("147.82"), "USD", "JPY")).toBe(14782n);
    expect(sellToBuyMinor(100n, new Big("147.82"), "USD", "JPY")).toBe(147n);
  });

  it("rounds down when converting out of JPY", () => {
    //¥1,000 at 0.006765 = $6.765 -> 676 cents
    expect(sellToBuyMinor(1000n, new Big("0.006765"), "JPY", "USD")).toBe(676n);
  });
});

describe("buyToSellMinor", () => {
  it("is exact when the rate divides evenly", () => {
    expect(buyToSellMinor(15247890n, new Big("1524.789"), "USD", "NGN")).toBe(10000n);
  });

  it("rounds up so the user always receives at least what they asked for", () => {
    //¥1,478 / 147.82 = $9.99864… -> 1000 cents
    expect(buyToSellMinor(1478n, new Big("147.82"), "USD", "JPY")).toBe(1000n);
  });

  it("never under-delivers across many amounts", () => {
    const rate = new Big("1524.78894400");
    for (let buy = 1n; buy <= 5000n; buy += 7n) {
      const sell = buyToSellMinor(buy, rate, "USD", "NGN");
      expect(sellToBuyMinor(sell, rate, "USD", "NGN")).toBeGreaterThanOrEqual(buy);
      //One minor unit less should not be enough, so we don't overcharge.
      if (sell > 1n) expect(sellToBuyMinor(sell - 1n, rate, "USD", "NGN")).toBeLessThan(buy);
    }
  });
});

describe("priceConversion", () => {
  const mid = new Big("1532.4512"); //USD -> NGN

  it("prices a fixed sell amount: spread, rounding and fee on top", () => {
    const result = priceConversion(mid, "USD", "NGN", { side: "sell", amount: 10000n });
    expect(result).toEqual({
      ok: true,
      priced: {
        sellAmount: 10000n,
        //$100 × 1524.788944 = ₦152,478.8944 -> 15247889 kobo (rounded down)
        buyAmount: 15247889n,
        rate: "1524.78894400",
        fee: 50n,
        totalDebit: 10050n,
      },
    });
  });

  it("prices a fixed buy amount: works out the sell amount, fee on that", () => {
    const result = priceConversion(mid, "USD", "NGN", { side: "buy", amount: 15247889n });
    expect(result.ok && result.priced).toMatchObject({ sellAmount: 10000n, buyAmount: 15247889n, fee: 50n });
  });

  it("rejects converting a currency to itself", () => {
    expect(priceConversion(new Big(1), "USD", "USD", { side: "sell", amount: 100n })).toEqual({
      ok: false,
      reason: "same_currency",
    });
  });

  it("rejects zero or negative amounts", () => {
    expect(priceConversion(mid, "USD", "NGN", { side: "sell", amount: 0n })).toEqual({
      ok: false,
      reason: "non_positive_amount",
    });
  });

  it("rejects amounts too small to produce anything", () => {
    //¥1 -> $0.0067 -> 0 cents
    expect(priceConversion(new Big("0.006765"), "JPY", "USD", { side: "sell", amount: 1n })).toEqual({
      ok: false,
      reason: "amount_too_small",
    });
  });
});
