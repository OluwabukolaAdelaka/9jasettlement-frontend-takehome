import type { DebugActionRequest, DebugStateResponse } from "@/lib/api/types";
import { fail, type ServerResult } from "./result";
import { initialBalances, type ServerState } from "./state";

export function debugState(state: ServerState): DebugStateResponse {
  return { ...state.debug };
}

function parseDebugAction(body: unknown): DebugActionRequest | null {
  if (typeof body !== "object" || body === null || !("action" in body)) return null;
  switch (body.action) {
    case "setRatesOutage":
      return "enabled" in body && typeof body.enabled === "boolean"
        ? { action: "setRatesOutage", enabled: body.enabled }
        : null;
    case "forceNextConversionExpired":
      return { action: "forceNextConversionExpired" };
    case "resetBalances":
      return { action: "resetBalances" };
    default:
      return null;
  }
}

//Reset only restores balances; history and quotes are kept so earlier receipts still open.
export function applyDebugAction(state: ServerState, body: unknown): ServerResult<DebugStateResponse> {
  const action = parseDebugAction(body);
  if (!action) {
    return fail(
      400,
      "INVALID_REQUEST",
      'Use { "action": "setRatesOutage", "enabled": true|false }, "forceNextConversionExpired" or "resetBalances".',
    );
  }

  switch (action.action) {
    case "setRatesOutage":
      state.debug.ratesOutage = action.enabled;
      break;
    case "forceNextConversionExpired":
      state.debug.forceNextConversionExpired = true;
      break;
    case "resetBalances":
      state.balances = initialBalances();
      break;
  }

  return { ok: true, status: 200, body: debugState(state) };
}
