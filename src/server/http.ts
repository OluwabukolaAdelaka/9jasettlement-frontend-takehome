import type { ApiErrorBody } from "@/lib/api/types";
import type { ServerResult } from "./result";

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status: number = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: NO_STORE });
}

export function resultResponse<T>(result: ServerResult<T>): Response {
  return result.ok ? jsonResponse(result.body, result.status) : errorResponse(result.status, result.code, result.message);
}

//REturns null when the request body is missing or invalid JSON.
export async function readJson(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    return body;
  } catch {
    return null;
  }
}
