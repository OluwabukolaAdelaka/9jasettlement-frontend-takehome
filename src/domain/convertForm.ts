import { type Currency, MINOR_DIGITS } from "./currency";
import { parseUserAmount } from "./money";
import type { FixedAmount, PricedConversion } from "./pricing";
import type { ConversionInput } from "./quote";

export type AmountSide = FixedAmount["side"];

export interface ConvertFormValues {
  sell: Currency;
  buy: Currency;
  side: AmountSide;
  amountText: string;
}

export type DraftError =
  | { kind: "same_currency" }
  | { kind: "amount_empty" }
  | { kind: "amount_invalid" }
  | { kind: "too_many_decimals"; currency: Currency; maxDecimals: number }
  | { kind: "amount_zero" };

export type DraftResult = { ok: true; input: ConversionInput } | { ok: false; error: DraftError };

//The amount is in the sell currency when selling, and the buy currency when receiving.
export function amountCurrency(values: ConvertFormValues): Currency {
  return values.side === "sell" ? values.sell : values.buy;
}

export function parseDraft(values: ConvertFormValues): DraftResult {
  if (values.sell === values.buy) return { ok: false, error: { kind: "same_currency" } };

  const currency = amountCurrency(values);
  const parsed = parseUserAmount(values.amountText, currency);
  if (!parsed.ok) {
    switch (parsed.reason) {
      case "empty":
        return { ok: false, error: { kind: "amount_empty" } };
      case "invalid":
        return { ok: false, error: { kind: "amount_invalid" } };
      case "too_many_decimals":
        return { ok: false, error: { kind: "too_many_decimals", currency, maxDecimals: MINOR_DIGITS[currency] } };
    }
  }
  if (parsed.minor === 0n) return { ok: false, error: { kind: "amount_zero" } };

  return {
    ok: true,
    input: { sell: values.sell, buy: values.buy, fixed: { side: values.side, amount: parsed.minor } },
  };
}

export interface Shortfall {
  currency: Currency;
  available: bigint;
  required: bigint;
}

//The total debit (sell amount + fee) must fit within the balance.
export function findShortfall(priced: PricedConversion, sell: Currency, available: bigint): Shortfall | null {
  return priced.totalDebit > available ? { currency: sell, available, required: priced.totalDebit } : null;
}
