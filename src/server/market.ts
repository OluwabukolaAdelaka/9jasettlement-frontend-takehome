import type Big from "big.js";
import type { Currency } from "@/domain/currency";
import { initialUsdRates } from "./state";

//Market rates are shared by everyone on a server instance and drift on every request. They aren't part of
//anyone's wallet, so instances differing slightly just looks like the market moving; a quote locks its own rate.
const globalForMarket = globalThis as typeof globalThis & { __swaprUsdRates?: Record<Currency, Big> };

export function getUsdRates(): Record<Currency, Big> {
  globalForMarket.__swaprUsdRates ??= initialUsdRates();
  return globalForMarket.__swaprUsdRates;
}

export function setUsdRates(rates: Record<Currency, Big>): void {
  globalForMarket.__swaprUsdRates = rates;
}
