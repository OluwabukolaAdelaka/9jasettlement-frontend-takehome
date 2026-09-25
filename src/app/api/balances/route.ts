import { CURRENCIES } from "@/domain/currency";
import type { BalancesResponse } from "@/lib/api/types";
import { jsonResponse } from "@/server/http";
import { readSession } from "@/server/session";
import { simulateLatency } from "@/server/simulate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await simulateLatency();
  const { balances } = readSession(request).state;
  const body: BalancesResponse = {
    balances: CURRENCIES.map((currency) => ({ currency, amount: balances[currency].toString() })),
  };
  return jsonResponse(body);
}
