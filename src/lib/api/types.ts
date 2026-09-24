import type { Currency } from "@/domain/currency";

//Shapes exactly as they cross the (mock) API boundary. Amounts are integer strings in minor units.

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
