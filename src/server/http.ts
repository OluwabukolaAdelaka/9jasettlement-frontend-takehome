import type { ApiErrorBody } from "@/lib/api/types";
import type { ServerResult } from "./result";

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status: number = 200, headers: HeadersInit = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function errorResponse(status: number, code: string, message: string, headers: HeadersInit = {}): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function resultResponse<T>(result: ServerResult<T>, headers: HeadersInit = {}): Response {
  return result.ok
    ? jsonResponse(result.body, result.status, headers)
    : errorResponse(result.status, result.code, result.message, headers);
}

//Returns null when the request body is missing or invalid JSON.
export async function readJson(request: Request): Promise<unknown> {
  try {
    const body: unknown = await request.json();
    return body;
  } catch {
    return null;
  }
}
