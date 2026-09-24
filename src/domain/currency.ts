export const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "JPY"] as const;

export type Currency = (typeof CURRENCIES)[number];

//Number of minor-unit digits per currency. JPY has no minor unit.
export const MINOR_DIGITS: Record<Currency, number> = {
  NGN: 2,
  USD: 2,
  GBP: 2,
  EUR: 2,
  JPY: 0,
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  NGN: "Nigerian Naira",
  USD: "US Dollar",
  GBP: "British Pound",
  EUR: "Euro",
  JPY: "Japanese Yen",
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}
