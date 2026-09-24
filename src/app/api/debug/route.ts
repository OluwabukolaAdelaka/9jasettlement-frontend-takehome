import { applyDebugAction, debugState } from "@/server/debug";
import { jsonResponse, readJson, resultResponse } from "@/server/http";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";

//No simulated latency: reviewers should see the switch take effect immediately.
export function GET() {
  return jsonResponse(debugState(getState()));
}

export async function POST(request: Request) {
  return resultResponse(applyDebugAction(getState(), await readJson(request)));
}
