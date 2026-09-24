import { describe, expect, it } from "vitest";
import { isUsableRate, mergeWithLastGood, rateDirection, rateDirections } from "./rates";

describe("isUsableRate", () => {
  it.each(["1532.45120000", "0.74210000", "147.82", "1"])("accepts %j", (value) => {
    expect(isUsableRate(value)).toBe(true);
  });

  it.each([undefined, "", "0", "0.00000000", "-1.5", "abc", "1.123456789", "1e3", "NaN"])(
    "rejects %j",
    (value) => {
      expect(isUsableRate(value)).toBe(false);
    },
  );
});

describe("rateDirection", () => {
  it("detects an increase", () => {
    expect(rateDirection("1532.45120000", "1532.45130000")).toBe("up");
  });

  it("detects a decrease", () => {
    expect(rateDirection("0.74210000", "0.74209999")).toBe("down");
  });

  it("treats equal values with different trailing zeros as unchanged", () => {
    expect(rateDirection("1.50000000", "1.5")).toBe("unchanged");
  });

  it("detects the smallest possible 8-dp move that a float could blur", () => {
    expect(rateDirection("123456789.12345678", "123456789.12345679")).toBe("up");
  });

  it("is unchanged when there is no previous rate (first load)", () => {
    expect(rateDirection(undefined, "147.82")).toBe("unchanged");
  });
});

describe("rateDirections", () => {
  it("returns a direction for each usable rate", () => {
    const previous = { NGN: "1500", EUR: "0.85", JPY: "147" };
    const next = { NGN: "1501", EUR: "0.84", JPY: "147.00000000", GBP: "0.74" };
    expect(rateDirections(previous, next)).toEqual({
      NGN: "up",
      EUR: "down",
      JPY: "unchanged",
      GBP: "unchanged",
    });
  });

  it("skips rates that are not usable", () => {
    expect(rateDirections({ NGN: "1500" }, { NGN: "0" })).toEqual({});
  });
});

describe("mergeWithLastGood", () => {
  it("prefers new usable rates", () => {
    expect(mergeWithLastGood({ NGN: "1500" }, { NGN: "1510" })).toEqual({ NGN: "1510" });
  });

  it("keeps the last good rate when the new one is zero, blank or missing", () => {
    const previous = { NGN: "1500", EUR: "0.85", JPY: "147" };
    const next = { NGN: "0", EUR: "" };
    expect(mergeWithLastGood(previous, next)).toEqual(previous);
  });

  it("never invents a rate that was never usable", () => {
    expect(mergeWithLastGood(undefined, { NGN: "0", EUR: "0.85" })).toEqual({ EUR: "0.85" });
  });
});
