import { isCurrency } from "@/domain/currency";
import type { ConversionResponse } from "./api/types";

//Browser copy of completed conversions, tagged with the wallet (session) they belong to.
//It survives page refreshes; if the wallet is new or was replaced, the copy is dropped so history and balances agree.
const STORAGE_KEY = "swapr.history.v2";
const LEGACY_KEY = "swapr.history.v1";

export interface StoredHistory {
  sessionId: string | null;
  conversions: ConversionResponse[];
}

const EMPTY: StoredHistory = { sessionId: null, conversions: [] };
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
export function parseStoredHistory(raw: string | null): StoredHistory {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || !("conversions" in parsed)) return EMPTY;
    const { conversions } = parsed;
    const sessionId = "sessionId" in parsed ? parsed.sessionId : null;
    return {
      sessionId: typeof sessionId === "string" ? sessionId : null,
      conversions: Array.isArray(conversions) ? conversions.filter(isConversion) : [],
    };
  } catch {
    return EMPTY;
  }
}

//Storage can be unavailable (private mode, blocked site data): history then just comes from the server.
export function loadLocalHistory(): StoredHistory {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    return parseStoredHistory(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY;
  }
}

export function saveLocalHistory(history: StoredHistory): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    //Not fatal: the server still has the history for this session.
  }
}
