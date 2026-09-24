"use client";

import { useQuery } from "@tanstack/react-query";
import type { Currency } from "@/domain/currency";
import { parseMinor } from "@/domain/money";
import { getBalances } from "@/lib/api/client";
import type { BalancesResponse } from "@/lib/api/types";

export interface Balance {
  currency: Currency;
  minor: bigint;
}

//Converts API money strings to BigInt before reaching components.
function toBalances(response: BalancesResponse): Balance[] {
  return response.balances.map((balance) => ({
    currency: balance.currency,
    minor: parseMinor(balance.amount),
  }));
}

export function useBalances() {
  return useQuery({
    queryKey: ["balances"],
    queryFn: getBalances,
    select: toBalances,
  });
}
