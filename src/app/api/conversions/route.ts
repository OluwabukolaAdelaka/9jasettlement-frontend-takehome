import type { ConversionsResponse } from "@/lib/api/types";
import { executeConversion } from "@/server/conversions";
import { jsonResponse, readJson, resultResponse } from "@/server/http";
import { simulateLatency } from "@/server/simulate";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";

export async function GET() {
  await simulateLatency();
  const body: ConversionsResponse = { conversions: getState().conversions };
  return jsonResponse(body);
}


export async function POST(request: Request) {
  const body = await readJson(request);
  await simulateLatency();
  //Check expiry after the delay, like a real server.
  //No await after this point, so validation and the balance update happen together.
  return resultResponse(executeConversion(getState(), body, Date.now()));
}
