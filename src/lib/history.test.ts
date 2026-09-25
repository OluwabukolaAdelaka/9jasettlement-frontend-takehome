import { describe, expect, it } from "vitest";
import type { ConversionResponse } from "./api/types";
import { mergeHistory } from "./history";
import { parseStoredHistory } from "./historyStorage";

const conversion = (id: string, createdAt: string): ConversionResponse => ({
  id,
  quoteId: `qt_${id}`,
  status: "completed",
  sellCurrency: "USD",
  sellAmount: "10000",
  buyCurrency: "NGN",
  buyAmount: "14925000",
  rate: "1492.50000000",
  fee: { currency: "USD", amount: "50" },
  createdAt,
});

describe("mergeHistory", () => {
  it("sorts newest first", () => {
    const older = conversion("a", "2026-09-24T10:00:00.000Z");
    const newer = conversion("b", "2026-09-24T11:00:00.000Z");
    expect(mergeHistory([older, newer]).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("keeps one entry per id when server and browser both have it", () => {
    const server = [conversion("a", "2026-09-24T10:00:00.000Z")];
    const local = [conversion("a", "2026-09-24T10:00:00.000Z"), conversion("b", "2026-09-24T09:00:00.000Z")];
    expect(mergeHistory(server, local).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("keeps browser history when the server has restarted and lost it", () => {
    const local = [conversion("a", "2026-09-24T10:00:00.000Z")];
    expect(mergeHistory([], local)).toEqual(local);
  });
});

describe("parseStoredHistory", () => {
  const empty = { serverInstance: null, conversions: [] };

  it("reads what was saved, with the server instance it came from", () => {
    const saved = { serverInstance: "srv-1", conversions: [conversion("a", "2026-09-24T10:00:00.000Z")] };
    expect(parseStoredHistory(JSON.stringify(saved))).toEqual(saved);
  });

  it.each([
    ["nothing", null],
    ["broken JSON", "{not json"],
    ["the old v1 format (a bare array)", JSON.stringify([conversion("a", "2026-09-24T10:00:00.000Z")])],
    ["an object without conversions", '{"serverInstance":"srv-1"}'],
  ])("returns empty history for %s", (_, raw) => {
    expect(parseStoredHistory(raw)).toEqual(empty);
  });

  it("drops malformed entries but keeps valid ones", () => {
    const valid = conversion("a", "2026-09-24T10:00:00.000Z");
    const floatAmount = { ...conversion("b", "2026-09-24T10:00:00.000Z"), sellAmount: "100.5" };
    const badCurrency = { ...conversion("c", "2026-09-24T10:00:00.000Z"), buyCurrency: "BTC" };
    const raw = JSON.stringify({ serverInstance: "srv-1", conversions: [valid, floatAmount, badCurrency, null] });
    expect(parseStoredHistory(raw)).toEqual({ serverInstance: "srv-1", conversions: [valid] });
  });
});
