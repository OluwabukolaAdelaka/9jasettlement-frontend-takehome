import { CURRENCIES } from "@/domain/currency";
import type { BalancesResponse } from "@/lib/api/types";
import { jsonResponse } from "@/server/http";
import { simulateLatency } from "@/server/simulate";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";

export async function GET() {
  await simulateLatency();
  const { balances } = getState();
  const body: BalancesResponse = {
    balances: CURRENCIES.map((currency) => ({ currency, amount: balances[currency].toString() })),
  };
  return jsonResponse(body);
}
