"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDebugState, runDebugAction } from "@/lib/api/client";
import type { DebugActionRequest } from "@/lib/api/types";

const DEBUG_KEY = ["debug"];

export function useDebugState() {
  //Polled so the panel shows when the one-shot "expire next conversion" switch has been used up.
  return useQuery({ queryKey: DEBUG_KEY, queryFn: getDebugState, refetchInterval: 3_000 });
}

export function useDebugAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: DebugActionRequest) => runDebugAction(action),
    onSuccess: (state, action) => {
      queryClient.setQueryData(DEBUG_KEY, state);
      if (action.action === "resetBalances") void queryClient.invalidateQueries({ queryKey: ["balances"] });
      if (action.action === "setRatesOutage") void queryClient.invalidateQueries({ queryKey: ["rates"] });
    },
  });
}
