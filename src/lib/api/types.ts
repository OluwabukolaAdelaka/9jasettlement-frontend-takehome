import type { Currency } from "@/domain/currency";

//API shapes. Amounts are integer strings in minor units.

export interface BalanceDto {
  currency: Currency;
  amount: string;
}

export interface BalancesResponse {
  balances: BalanceDto[];
}

export interface RatesResponse {
  base: Currency;
  rates: Partial<Record<Currency, string>>;
  timestamp: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface MoneyDto {
  currency: Currency;
  amount: string;
}

//Provide exactly one of sellAmount or buyAmount.
export interface CreateQuoteRequest {
  sellCurrency: Currency;
  buyCurrency: Currency;
  sellAmount?: string;
  buyAmount?: string;
}

export interface QuoteResponse {
  id: string;
  sellCurrency: Currency;
  buyCurrency: Currency;
  sellAmount: string;
  buyAmount: string;
  rate: string;
  fee: MoneyDto;
  expiresAt: string;
  serverTime: string;
}

export interface CreateConversionRequest {
  quoteId: string;
  idempotencyKey: string;
}

export interface ConversionResponse {
  id: string;
  quoteId: string;
  status: "completed";
  sellCurrency: Currency;
  sellAmount: string;
  buyCurrency: Currency;
  buyAmount: string;
  rate: string;
  fee: MoneyDto;
  createdAt: string;
}

//Conversions are returned newest first.
export interface ConversionsResponse {
  conversions: ConversionResponse[];
  serverInstance: string;
}

export interface DebugStateResponse {
  ratesOutage: boolean;
  forceNextConversionExpired: boolean;
}

export type DebugActionRequest =
  | { action: "setRatesOutage"; enabled: boolean }
  | { action: "forceNextConversionExpired" }
  | { action: "resetBalances" };

export type ApiErrorCode =
  | "INVALID_BASE"
  | "INVALID_REQUEST"
  | "SAME_CURRENCY"
  | "AMOUNT_TOO_SMALL"
  | "INSUFFICIENT_FUNDS"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "QUOTE_ALREADY_USED"
  | "IDEMPOTENCY_KEY_REUSED"
  | "RATES_UNAVAILABLE";
