import type { ConversionResponse } from "./api/types";

//Combines server and browser history: one entry per conversion id, newest first.
export function mergeHistory(...lists: ConversionResponse[][]): ConversionResponse[] {
  const byId = new Map<string, ConversionResponse>();
  for (const list of lists) {
    for (const conversion of list) {
      if (!byId.has(conversion.id)) byId.set(conversion.id, conversion);
    }
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
