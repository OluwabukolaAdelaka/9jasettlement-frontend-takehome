"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversions } from "@/lib/api/client";
import { toConversionRecord } from "@/lib/api/mappers";
import type { ConversionResponse } from "@/lib/api/types";
import { mergeHistory } from "@/lib/history";
import { loadLocalHistory, saveLocalHistory } from "@/lib/historyStorage";

async function fetchHistory(): Promise<ConversionResponse[]> {
  const local = loadLocalHistory();
  try {
    const { conversions } = await getConversions();
    const merged = mergeHistory(conversions, local);
    saveLocalHistory(merged);
    return merged;
  } catch (error) {
    //If the server is unreachable, the browser copy is still a correct (if possibly incomplete) history.
    if (local.length > 0) return local;
    throw error;
  }
}

export function useConversions() {
  return useQuery({
    queryKey: ["conversions"],
    queryFn: fetchHistory,
    select: (conversions) => conversions.map(toConversionRecord),
  });
}
