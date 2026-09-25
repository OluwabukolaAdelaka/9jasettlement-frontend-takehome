import { readJson, resultResponse } from "@/server/http";
import { createQuote } from "@/server/quotes";
import { readSession, sessionCookieHeader } from "@/server/session";
import { simulateLatency } from "@/server/simulate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  await simulateLatency();
  const { state } = readSession(request);
  const result = createQuote(state, body, Date.now());
  //A rejected quote changes nothing, so only a new quote updates the cookie.
  return resultResponse(result, result.ok ? sessionCookieHeader(state) : {});
}
