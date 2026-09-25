"use client";

import { useState } from "react";
import type { Currency } from "@/domain/currency";
import {
  mergeWithLastGood,
  rateDirections,
  type RateDirection,
  type RatesAgainstBase,
} from "@/domain/rates";
import { useRates } from "./useRates";

interface Snapshot {
  base: Currency;
  updatedAt: number;
  current: RatesAgainstBase;
  previous: RatesAgainstBase | undefined;
}

export interface RateBoard {
  //Rates are never blank or zero; use the last good value instead.
  rates: RatesAgainstBase;
  directions: Partial<Record<Currency, RateDirection>>;
}

export function useRateBoard(base: Currency) {
  const query = useRates(base);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  //Remember the rates each new response replaced. Updating state during render (not in an effect)
  //is React's recommended way to track a previous value.
  if (query.data && (snapshot?.updatedAt !== query.dataUpdatedAt || snapshot.base !== base)) {
    const sameBase = snapshot?.base === base;
    const previous = sameBase ? snapshot.current : undefined;
    setSnapshot({
      base,
      updatedAt: query.dataUpdatedAt,
      current: mergeWithLastGood(previous, query.data.rates),
      previous,
    });
  }

  const board: RateBoard | undefined =
    snapshot && snapshot.base === base
      ? { rates: snapshot.current, directions: rateDirections(snapshot.previous, snapshot.current) }
      : undefined;

  return { query, board };
}
