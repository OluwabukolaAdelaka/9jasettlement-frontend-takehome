import { isCurrency } from "@/domain/currency";
import { errorResponse, jsonResponse } from "@/server/http";
import { driftRates, ratesResponse } from "@/server/rates";
import { shouldFailTransiently, simulateLatency } from "@/server/simulate";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await simulateLatency();

  const base = new URL(request.url).searchParams.get("base");
  if (!isCurrency(base)) {
    return errorResponse(400, "INVALID_BASE", "Choose one of NGN, USD, GBP, EUR or JPY as the base currency.");
  }

  const state = getState();
  if (state.debug.ratesOutage || shouldFailTransiently()) {
    return errorResponse(503, "RATES_UNAVAILABLE", "Live rates are temporarily unavailable. Try again shortly.");
  }

  driftRates(state.usdRates);
  return jsonResponse(ratesResponse(state.usdRates, base, new Date()));
}
