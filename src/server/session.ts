import { createHmac, timingSafeEqual } from "node:crypto";
import { isCurrency, type Currency } from "@/domain/currency";
import type { ConversionResponse } from "@/lib/api/types";
import { getUsdRates } from "./market";
import { createSession, initialBalances, type ServerState, type StoredQuote } from "./state";

/**
 * Each visitor's wallet travels in a signed cookie instead of living in one server's memory.
 * Vercel may run several instances at once; because every instance reads the same cookie,
 * they all give the same answer, and each visitor gets their own sandbox wallet.
 * The HMAC signature means the browser carries the state but cannot edit it.
 */

export const SESSION_COOKIE = "swapr_session";
export const MAX_CONVERSIONS = 10;
const MAX_QUOTES = 5;
//Used quotes are kept a little past expiry so a second confirm still gets QUOTE_ALREADY_USED, not QUOTE_NOT_FOUND.
const QUOTE_GRACE_MS = 60_000;
//Browsers cap a cookie at ~4 KB including its name and attributes.
export const MAX_COOKIE_VALUE_LENGTH = 3_800;

//A mock with no real secrets: a constant keeps "no environment setup", and SESSION_SECRET can override it.
const SECRET = process.env.SESSION_SECRET ?? "swapr-mock-session-v1";

export type SessionState = Omit<ServerState, "usdRates">;

type EncodedQuote = [
  id: string,
  sell: Currency,
  buy: Currency,
  sellAmount: string,
  buyAmount: string,
  rate: string,
  fee: string,
  createdAtMs: number,
  expiresAtMs: number,
  usedBy: string | null,
];

type EncodedConversion = [
  id: string,
  quoteId: string,
  sell: Currency,
  sellAmount: string,
  buy: Currency,
  buyAmount: string,
  rate: string,
  fee: string,
  createdAtMs: number,
  idempotencyKey: string | null,
];

interface Payload {
  v: 1;
  id: string;
  b: Record<Currency, string>;
  q: EncodedQuote[];
  c: EncodedConversion[];
  d: [ratesOutage: 0 | 1, forceNextConversionExpired: 0 | 1];
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function toPayload(state: SessionState, nowMs: number, maxConversions: number): Payload {
  const keyByConversionId = new Map<string, string>();
  for (const [key, conversion] of state.idempotency) keyByConversionId.set(conversion.id, key);

  const quotes = [...state.quotes.values()]
    .filter((quote) => quote.expiresAtMs + QUOTE_GRACE_MS >= nowMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, MAX_QUOTES);

  return {
    v: 1,
    id: state.sessionId,
    b: {
      NGN: state.balances.NGN.toString(),
      USD: state.balances.USD.toString(),
      GBP: state.balances.GBP.toString(),
      EUR: state.balances.EUR.toString(),
      JPY: state.balances.JPY.toString(),
    },
    q: quotes.map((q) => [
      q.id,
      q.sellCurrency,
      q.buyCurrency,
      q.sellAmount.toString(),
      q.buyAmount.toString(),
      q.rate,
      q.fee.toString(),
      q.createdAtMs,
      q.expiresAtMs,
      q.usedByConversionId,
    ]),
    c: state.conversions.slice(0, maxConversions).map((c) => [
      c.id,
      c.quoteId,
      c.sellCurrency,
      c.sellAmount,
      c.buyCurrency,
      c.buyAmount,
      c.rate,
      c.fee.amount,
      Date.parse(c.createdAt),
      keyByConversionId.get(c.id) ?? null,
    ]),
    d: [state.debug.ratesOutage ? 1 : 0, state.debug.forceNextConversionExpired ? 1 : 0],
  };
}

//Drops the oldest conversions if needed to stay under the cookie size limit.
export function encodeSession(state: SessionState, nowMs: number): string {
  for (let keep = MAX_CONVERSIONS; keep >= 0; keep--) {
    const data = Buffer.from(JSON.stringify(toPayload(state, nowMs, keep))).toString("base64url");
    const value = `${data}.${sign(data)}`;
    if (value.length <= MAX_COOKIE_VALUE_LENGTH || keep === 0) return value;
  }
  throw new Error("unreachable");
}

function fromPayload(payload: Payload): SessionState {
  const balances = initialBalances();
  for (const currency of Object.keys(balances)) {
    if (isCurrency(currency)) balances[currency] = BigInt(payload.b[currency]);
  }

  const quotes = new Map<string, StoredQuote>();
  for (const [id, sell, buy, sellAmount, buyAmount, rate, fee, createdAtMs, expiresAtMs, usedBy] of payload.q) {
    quotes.set(id, {
      id,
      sellCurrency: sell,
      buyCurrency: buy,
      sellAmount: BigInt(sellAmount),
      buyAmount: BigInt(buyAmount),
      rate,
      fee: BigInt(fee),
      createdAtMs,
      expiresAtMs,
      usedByConversionId: usedBy,
    });
  }

  const conversions: ConversionResponse[] = [];
  const idempotency = new Map<string, ConversionResponse>();
  for (const [id, quoteId, sell, sellAmount, buy, buyAmount, rate, fee, createdAtMs, key] of payload.c) {
    const conversion: ConversionResponse = {
      id,
      quoteId,
      status: "completed",
      sellCurrency: sell,
      sellAmount,
      buyCurrency: buy,
      buyAmount,
      rate,
      fee: { currency: sell, amount: fee },
      createdAt: new Date(createdAtMs).toISOString(),
    };
    conversions.push(conversion);
    if (key) idempotency.set(key, conversion);
  }

  return {
    sessionId: payload.id,
    balances,
    quotes,
    conversions,
    idempotency,
    debug: { ratesOutage: payload.d[0] === 1, forceNextConversionExpired: payload.d[1] === 1 },
  };
}

function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

//The visitor's wallet from their cookie (or a fresh one), combined with this instance's market rates.
export function readSession(request: Request): { state: ServerState; isNew: boolean } {
  const saved = decodeSession(readCookie(request, SESSION_COOKIE));
  return { state: { ...(saved ?? createSession()), usdRates: getUsdRates() }, isNew: saved === null };
}

//Only requests that change the wallet send this back, so a slow read (e.g. a rates poll) can never overwrite a newer write.
export function sessionCookieHeader(state: SessionState): HeadersInit {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const value = encodeSession(state, Date.now());
  return { "Set-Cookie": `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}` };
}

//Returns null for a missing, tampered or unreadable cookie; the caller then starts a fresh wallet.
export function decodeSession(value: string | undefined): SessionState | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const data = value.slice(0, dot);
  const signature = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(data));
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Payload;
    return payload.v === 1 ? fromPayload(payload) : null;
  } catch {
    return null;
  }
}
