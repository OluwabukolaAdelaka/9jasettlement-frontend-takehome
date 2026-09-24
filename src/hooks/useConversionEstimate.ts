"use client";

import type { Currency } from "@/domain/currency";
import { priceFromRates, type EstimateResult } from "@/domain/pricing";
import type { ConversionInput } from "@/domain/quote";
import { useRates } from "./useRates";

//Indicative price from the live mid-market rate. Uses the same pricing rules as the quote endpoint.
export function useConversionEstimate(sell: Currency, input: ConversionInput | null) {
  const rates = useRates(sell);
  const estimate: EstimateResult | undefined =
    input && rates.data
      ? priceFromRates(rates.data.rates, rates.data.base, input.sell, input.buy, input.fixed)
      : undefined;
  return { rates, estimate };
}
