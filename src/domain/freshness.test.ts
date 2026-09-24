import { describe, expect, it } from "vitest";
import { isStale, STALE_AFTER_MS } from "./freshness";

describe("isStale", () => {
  const updatedAt = 1_000_000;

  it("is fresh right after an update", () => {
    expect(isStale(updatedAt, updatedAt)).toBe(false);
  });

  it("is still fresh at exactly 15 seconds", () => {
    expect(isStale(updatedAt, updatedAt + STALE_AFTER_MS)).toBe(false);
  });

  it("is stale after 15 seconds", () => {
    expect(isStale(updatedAt, updatedAt + STALE_AFTER_MS + 1)).toBe(true);
  });

  it("accepts a custom threshold", () => {
    expect(isStale(updatedAt, updatedAt + 5_001, 5_000)).toBe(true);
  });
});
