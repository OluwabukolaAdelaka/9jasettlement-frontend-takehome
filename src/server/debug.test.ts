import { beforeEach, describe, expect, it } from "vitest";
import { applyDebugAction } from "./debug";
import { createInitialState, initialBalances, type ServerState } from "./state";

let state: ServerState;
beforeEach(() => {
  state = createInitialState();
});

describe("applyDebugAction", () => {
  it("turns the rates outage on and off", () => {
    expect(applyDebugAction(state, { action: "setRatesOutage", enabled: true })).toMatchObject({
      ok: true,
      body: { ratesOutage: true },
    });
    applyDebugAction(state, { action: "setRatesOutage", enabled: false });
    expect(state.debug.ratesOutage).toBe(false);
  });

  it("arms a one-shot forced expiry for the next conversion", () => {
    applyDebugAction(state, { action: "forceNextConversionExpired" });
    expect(state.debug.forceNextConversionExpired).toBe(true);
  });

  it("restores the starting balances but keeps history", () => {
    state.balances.USD = 1n;
    state.balances.NGN = 999n;
    state.conversions.push({
      id: "cv_1",
      quoteId: "qt_1",
      status: "completed",
      sellCurrency: "USD",
      sellAmount: "100",
      buyCurrency: "NGN",
      buyAmount: "150000",
      rate: "1500.00000000",
      fee: { currency: "USD", amount: "1" },
      createdAt: "2026-09-24T10:15:05.000Z",
    });

    applyDebugAction(state, { action: "resetBalances" });

    expect(state.balances).toEqual(initialBalances());
    expect(state.conversions).toHaveLength(1);
  });

  it.each([
    ["no body", null],
    ["an unknown action", { action: "deleteEverything" }],
    ["setRatesOutage without enabled", { action: "setRatesOutage" }],
    ["enabled as a string", { action: "setRatesOutage", enabled: "true" }],
  ])("rejects %s with 400", (_, body) => {
    expect(applyDebugAction(state, body)).toMatchObject({ ok: false, status: 400, code: "INVALID_REQUEST" });
    expect(state.debug).toEqual({ ratesOutage: false, forceNextConversionExpired: false });
  });
});
