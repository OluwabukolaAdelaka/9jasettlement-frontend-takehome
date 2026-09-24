import type { Currency } from "@/domain/currency";
import { parseMinor } from "@/domain/money";
import type { ConversionResponse } from "./types";

//Completed conversion with amounts as bigint, used by the receipt and history.
export interface ConversionRecord {
  id: string;
  quoteId: string;
  sell: Currency;
  buy: Currency;
  sellAmount: bigint;
  buyAmount: bigint;
  rate: string;
  fee: bigint;
  createdAt: string;
}

export function toConversionRecord(dto: ConversionResponse): ConversionRecord {
  return {
    id: dto.id,
    quoteId: dto.quoteId,
    sell: dto.sellCurrency,
    buy: dto.buyCurrency,
    sellAmount: parseMinor(dto.sellAmount),
    buyAmount: parseMinor(dto.buyAmount),
    rate: dto.rate,
    fee: parseMinor(dto.fee.amount),
    createdAt: dto.createdAt,
  };
}
