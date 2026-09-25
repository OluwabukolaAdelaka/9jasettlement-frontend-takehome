import { isCurrency } from "@/domain/currency";
import type { ConversionResponse } from "./api/types";

//Browser copy of completed conversions, so history survives a refresh even if the serverless function restarted.
const STORAGE_KEY = "swapr.history.v1";
const INTEGER = /^\d+$/;

function isConversion(value: unknown): value is ConversionResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const fee = v.fee as Record<string, unknown> | null | undefined;
  return (
    typeof v.id === "string" &&
    typeof v.quoteId === "string" &&
    v.status === "completed" &&
    isCurrency(v.sellCurrency) &&
    isCurrency(v.buyCurrency) &&
    typeof v.sellAmount === "string" &&
    INTEGER.test(v.sellAmount) &&
    typeof v.buyAmount === "string" &&
    INTEGER.test(v.buyAmount) &&
    typeof v.rate === "string" &&
    typeof fee === "object" &&
    fee !== null &&
    isCurrency(fee.currency) &&
    typeof fee.amount === "string" &&
    INTEGER.test(fee.amount) &&
    typeof v.createdAt === "string" &&
    !Number.isNaN(Date.parse(v.createdAt))
  );
}

//Ignores anything malformed rather than letting a bad entry break the page.
export function parseStoredHistory(raw: string | null): ConversionResponse[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isConversion) : [];
  } catch {
    return [];
  }
}

//Storage can be unavailable (private mode, blocked site data): history then just comes from the server.
export function loadLocalHistory(): ConversionResponse[] {
  try {
    return parseStoredHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveLocalHistory(conversions: ConversionResponse[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversions));
  } catch {
    //Not fatal: the server still has the history for this session.
  }
}
