import type { ApiErrorCode } from "@/lib/api/types";

//Result of a server operation, converted to an HTTP response by the route.
export type ServerResult<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; code: ApiErrorCode; message: string };

export function fail(status: number, code: ApiErrorCode, message: string): ServerResult<never> {
  return { ok: false, status, code, message };
}

export function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
