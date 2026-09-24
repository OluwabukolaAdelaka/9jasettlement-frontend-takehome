import { describe, expect, it } from "vitest";
import { formatMoney, minorToMajorString, parseMinor, parseUserAmount } from "./money";

describe("parseMinor", () => {
  it("parses integer strings into bigint", () => {
    expect(parseMinor("125000050")).toBe(125000050n);
    expect(parseMinor("0")).toBe(0n);
  });

  it("keeps precision beyond Number.MAX_SAFE_INTEGER", () => {
    expect(parseMinor("9007199254740993")).toBe(9007199254740993n);
  });

  it.each(["", "12.5", "1e5", "abc", " 10"])("rejects %j", (value) => {
    expect(() => parseMinor(value)).toThrow();
  });
});

describe("minorToMajorString", () => {
  it("uses 2 decimals for USD/NGN/GBP/EUR", () => {
    expect(minorToMajorString(250075n, "USD")).toBe("2500.75");
    expect(minorToMajorString(125000050n, "NGN")).toBe("1250000.50");
    expect(minorToMajorString(5n, "GBP")).toBe("0.05");
  });

  it("uses 0 decimals for JPY", () => {
    expect(minorToMajorString(150000n, "JPY")).toBe("150000");
  });
});

describe("parseUserAmount", () => {
  it("converts major input to minor units without float error", () => {
    //0.1 + 0.2 style inputs that break with floats
    expect(parseUserAmount("0.29", "USD")).toEqual({ ok: true, minor: 29n });
    expect(parseUserAmount("1.15", "USD")).toEqual({ ok: true, minor: 115n });
    expect(parseUserAmount("100", "USD")).toEqual({ ok: true, minor: 10000n });
    expect(parseUserAmount("100.", "USD")).toEqual({ ok: true, minor: 10000n });
    expect(parseUserAmount(".5", "EUR")).toEqual({ ok: true, minor: 50n });
  });

  it("treats JPY input as whole yen", () => {
    expect(parseUserAmount("1500", "JPY")).toEqual({ ok: true, minor: 1500n });
    expect(parseUserAmount("1500.5", "JPY")).toEqual({ ok: false, reason: "too_many_decimals" });
  });

  it("rejects more decimals than the currency allows", () => {
    expect(parseUserAmount("1.234", "USD")).toEqual({ ok: false, reason: "too_many_decimals" });
  });

  it("rejects empty and malformed input", () => {
    expect(parseUserAmount("  ", "USD")).toEqual({ ok: false, reason: "empty" });
    expect(parseUserAmount("-5", "USD")).toEqual({ ok: false, reason: "invalid" });
    expect(parseUserAmount("1,000", "USD")).toEqual({ ok: false, reason: "invalid" });
    expect(parseUserAmount("abc", "USD")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("formatMoney", () => {
  it("formats with symbol, grouping and 2 decimals", () => {
    expect(formatMoney(250075n, "USD", "en-US")).toBe("$2,500.75");
    expect(formatMoney(48020n, "EUR", "en-US")).toBe("€480.20");
    expect(formatMoney(0n, "GBP", "en-GB")).toBe("£0.00");
  });

  it.each(["en-NG", "en-US", "en-GB"])("formats NGN with the naira symbol in %s", (locale) => {
    expect(formatMoney(125000050n, "NGN", locale)).toBe("₦1,250,000.50");
  });

  it("formats JPY with 0 decimals", () => {
    expect(formatMoney(150000n, "JPY", "en-US")).toBe("¥150,000");
  });

  it("does not lose precision on very large balances", () => {
    expect(formatMoney(123456789012345678n, "USD", "en-US")).toBe("$1,234,567,890,123,456.78");
  });
});
