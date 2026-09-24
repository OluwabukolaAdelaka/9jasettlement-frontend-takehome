import type { Currency } from "@/domain/currency";
import type {
  ApiErrorBody,
  BalancesResponse,
  ConversionResponse,
  ConversionsResponse,
  CreateConversionRequest,
  CreateQuoteRequest,
  DebugActionRequest,
  DebugStateResponse,
  QuoteResponse,
  RatesResponse,
} from "./types";

//The UI talks to the mock API through this client.

export class ApiError extends Error {
  constructor(
    //HTTP status, or 0 when the request never reached the server.
    readonly status: number,
    //Error code from the API, e.g. "quote expired", or "network error".
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const { error } = body;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "We couldn't reach the server. Check your connection.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) throw new ApiError(response.status, body.error.code, body.error.message);
    throw new ApiError(response.status, "UNKNOWN_ERROR", "Something went wrong. Please try again.");
  }

  return body as T;
}

export function getBalances(): Promise<BalancesResponse> {
  return request<BalancesResponse>("/api/balances");
}

export function getRates(base: Currency): Promise<RatesResponse> {
  return request<RatesResponse>(`/api/rates?base=${encodeURIComponent(base)}`);
}

export function createQuote(body: CreateQuoteRequest): Promise<QuoteResponse> {
  return request<QuoteResponse>("/api/quotes", { method: "POST", body: JSON.stringify(body) });
}

export function createConversion(body: CreateConversionRequest): Promise<ConversionResponse> {
  return request<ConversionResponse>("/api/conversions", { method: "POST", body: JSON.stringify(body) });
}

export function getConversions(): Promise<ConversionsResponse> {
  return request<ConversionsResponse>("/api/conversions");
}

export function getDebugState(): Promise<DebugStateResponse> {
  return request<DebugStateResponse>("/api/debug");
}

export function runDebugAction(body: DebugActionRequest): Promise<DebugStateResponse> {
  return request<DebugStateResponse>("/api/debug", { method: "POST", body: JSON.stringify(body) });
}
