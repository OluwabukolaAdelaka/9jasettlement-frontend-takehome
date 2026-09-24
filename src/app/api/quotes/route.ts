import { readJson, resultResponse } from "@/server/http";
import { createQuote } from "@/server/quotes";
import { simulateLatency } from "@/server/simulate";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson(request);
  await simulateLatency();
  return resultResponse(createQuote(getState(), body, Date.now()));
}
