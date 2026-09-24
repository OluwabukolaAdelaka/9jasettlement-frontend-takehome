"use client";

import { useQuery } from "@tanstack/react-query";
import type { Currency } from "@/domain/currency";
import { getRates } from "@/lib/api/client";

export const RATES_REFRESH_MS = 5_000;

//Refreshes exchange rates every 5 seconds.
//Keeps the last good rates if a refresh fails and pauses refreshes when the tab is hidden.
export function useRates(base: Currency) {
  return useQuery({
    queryKey: ["rates", base],
    queryFn: () => getRates(base),
    refetchInterval: RATES_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}
