import { applyDebugAction, debugState } from "@/server/debug";
import { jsonResponse, readJson, resultResponse } from "@/server/http";
import { readSession, sessionCookieHeader } from "@/server/session";

export const dynamic = "force-dynamic";

//No simulated latency: reviewers should see the switch take effect immediately.
export function GET(request: Request) {
  return jsonResponse(debugState(readSession(request).state));
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const { state } = readSession(request);
  const result = applyDebugAction(state, body);
  return resultResponse(result, result.ok ? sessionCookieHeader(state) : {});
}
