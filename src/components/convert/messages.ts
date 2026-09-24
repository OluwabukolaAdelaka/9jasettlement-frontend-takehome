import type { DraftError, Shortfall } from "@/domain/convertForm";
import { formatMoney } from "@/domain/money";


export function draftErrorMessage(error: DraftError): string | null {
  switch (error.kind) {
    case "same_currency":
      return "Choose two different currencies.";
    case "amount_empty":
      return null;
    case "amount_invalid":
      return "Enter a number, like 250 or 250.50.";
    case "too_many_decimals":
      return error.maxDecimals === 0
        ? `${error.currency} has no decimal places. Enter a whole number.`
        : `${error.currency} allows up to ${error.maxDecimals} decimal places.`;
    case "amount_zero":
      return "Enter an amount greater than zero.";
  }
}

export function shortfallMessage({ currency, available, required }: Shortfall): string {
  return `Not enough ${currency}. You have ${formatMoney(available, currency)}, and this needs ${formatMoney(required, currency)} including the fee.`;
}

export const AMOUNT_TOO_SMALL_MESSAGE = "This amount is too small to convert. Try a larger amount.";
