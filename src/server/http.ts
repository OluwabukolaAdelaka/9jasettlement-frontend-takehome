import type { ApiErrorBody } from "@/lib/api/types";

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status: number = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(status: number, code: string, message: string): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: NO_STORE });
}
