import type { ConversionsResponse } from "@/lib/api/types";
import { executeConversion } from "@/server/conversions";
import { jsonResponse, readJson, resultResponse } from "@/server/http";
import { readSession, sessionCookieHeader } from "@/server/session";
import { simulateLatency } from "@/server/simulate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await simulateLatency();
  const { state, isNew } = readSession(request);
  const body: ConversionsResponse = { conversions: state.conversions, sessionId: isNew ? null : state.sessionId };
  return jsonResponse(body);
}

export async function POST(request: Request) {
  const body = await readJson(request);
  await simulateLatency();
  const { state } = readSession(request);
  //Check expiry after the delay, like a real server.
  //No await after this point, so validation and the balance update happen together.
  const result = executeConversion(state, body, Date.now());
  //Written even on failure: a failed confirm can still use up the one-shot "force expired" debug switch.
  return resultResponse(result, sessionCookieHeader(state));
}
