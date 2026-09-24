import Big from "big.js";
import type { Currency } from "@/domain/currency";
import type { ConversionResponse } from "@/lib/api/types";

//In-memory state for the mock API; it resets when the server restarts.

export interface DebugFlags {
  ratesOutage: boolean;
  forceNextConversionExpired: boolean;
}

export interface StoredQuote {
  id: string;
  sellCurrency: Currency;
  buyCurrency: Currency;
  sellAmount: bigint;
  buyAmount: bigint;
  rate: string;
  fee: bigint;
  createdAtMs: number;
  expiresAtMs: number;
  usedByConversionId: string | null;
}

export interface ServerState {
  balances: Record<Currency, bigint>;
  usdRates: Record<Currency, Big>;
  quotes: Map<string, StoredQuote>;
  conversions: ConversionResponse[];
  idempotency: Map<string, ConversionResponse>;
  debug: DebugFlags;
}

const INITIAL_BALANCES: Record<Currency, string> = {
  NGN: "125000050",
  USD: "250075",
  GBP: "0",
  EUR: "48020",
  JPY: "150000",
};

const INITIAL_USD_RATES: Record<Currency, string> = {
  NGN: "1532.45120000",
  USD: "1",
  GBP: "0.74210000",
  EUR: "0.85430000",
  JPY: "147.82000000",
};

function mapValues<T>(record: Record<Currency, string>, fn: (value: string) => T): Record<Currency, T> {
  return {
    NGN: fn(record.NGN),
    USD: fn(record.USD),
    GBP: fn(record.GBP),
    EUR: fn(record.EUR),
    JPY: fn(record.JPY),
  };
}

export function initialBalances(): Record<Currency, bigint> {
  return mapValues(INITIAL_BALANCES, (amount) => BigInt(amount));
}

export function createInitialState(): ServerState {
  return {
    balances: initialBalances(),
    usdRates: mapValues(INITIAL_USD_RATES, (rate) => new Big(rate)),
    quotes: new Map(),
    conversions: [],
    idempotency: new Map(),
    debug: { ratesOutage: false, forceNextConversionExpired: false },
  };
}

//Keeps state across hot reloads in development and shares it across routes.
const globalForState = globalThis as typeof globalThis & { __swaprState?: ServerState };

export function getState(): ServerState {
  globalForState.__swaprState ??= createInitialState();
  return globalForState.__swaprState;
}
