"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversions } from "@/lib/api/client";
import { toConversionRecord } from "@/lib/api/mappers";
import type { ConversionResponse } from "@/lib/api/types";
import { mergeHistory } from "@/lib/history";
import { loadLocalHistory, saveLocalHistory } from "@/lib/historyStorage";

async function fetchHistory(): Promise<ConversionResponse[]> {
  const stored = loadLocalHistory();
  try {
    const { conversions, serverInstance } = await getConversions();
    //A different instance means the server restarted with fresh balances: drop the old copy so history matches them.
    const local = stored.serverInstance === serverInstance ? stored.conversions : [];
    const merged = mergeHistory(conversions, local);
    saveLocalHistory({ serverInstance, conversions: merged });
    return merged;
  } catch (error) {
    //If the server is unreachable, the browser copy is the best history we have.
    if (stored.conversions.length > 0) return stored.conversions;
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
