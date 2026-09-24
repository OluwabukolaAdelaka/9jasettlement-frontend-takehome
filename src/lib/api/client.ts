import type { Currency } from "@/domain/currency";
import { SAMPLE_BALANCES, sampleRatesFor } from "./sampleData";
import type { BalancesResponse, RatesResponse } from "./types";

//The only place the UI gets data from. Components and hooks never know where it comes from.
//For now it returns sample data; later each function becomes a fetch() to our mock API routes.

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getBalances(): Promise<BalancesResponse> {
  await delay(600);
  return SAMPLE_BALANCES;
}

export async function getRates(base: Currency): Promise<RatesResponse> {
  await delay(400);
  return sampleRatesFor(base);
}
