import { describe, expect, it } from "vitest";
import { findShortfall, parseDraft, type ConvertFormValues } from "./convertForm";

const values = (overrides: Partial<ConvertFormValues>): ConvertFormValues => ({
  sell: "USD",
  buy: "NGN",
  side: "sell",
  amountText: "100",
  ...overrides,
});

describe("parseDraft", () => {
  it("parses a send amount in the sell currency", () => {
    expect(parseDraft(values({}))).toEqual({
      ok: true,
      input: { sell: "USD", buy: "NGN", fixed: { side: "sell", amount: 10000n } },
    });
  });

  it("parses a receive amount in the buy currency", () => {
    expect(parseDraft(values({ side: "buy", buy: "JPY", amountText: "1500" }))).toEqual({
      ok: true,
      input: { sell: "USD", buy: "JPY", fixed: { side: "buy", amount: 1500n } },
    });
  });

  it("rejects converting a currency to itself before looking at the amount", () => {
    expect(parseDraft(values({ buy: "USD", amountText: "" }))).toEqual({
      ok: false,
      error: { kind: "same_currency" },
    });
  });

  it("uses the decimals of the currency being typed", () => {
    //Receiving JPY: decimals aren't allowed.
    expect(parseDraft(values({ side: "buy", buy: "JPY", amountText: "10.5" }))).toEqual({
      ok: false,
      error: { kind: "too_many_decimals", currency: "JPY", maxDecimals: 0 },
    });
  });

  it.each([
    ["", "amount_empty"],
    ["abc", "amount_invalid"],
    ["1,000", "amount_invalid"],
    ["0", "amount_zero"],
    ["0.00", "amount_zero"],
  ])("reports %j as %s", (amountText, kind) => {
    expect(parseDraft(values({ amountText }))).toEqual({ ok: false, error: expect.objectContaining({ kind }) });
  });
});

describe("findShortfall", () => {
  const priced = { sellAmount: 10000n, buyAmount: 15247889n, rate: "1524.78894400", fee: 50n, totalDebit: 10050n };

  it("is fine when the balance covers sell amount + fee exactly", () => {
    expect(findShortfall(priced, "USD", 10050n)).toBeNull();
  });

  it("catches a balance that covers the amount but not the fee", () => {
    expect(findShortfall(priced, "USD", 10049n)).toEqual({ currency: "USD", available: 10049n, required: 10050n });
  });
});
