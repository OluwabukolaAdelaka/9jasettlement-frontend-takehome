"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { type ApiError, createConversion, toApiError } from "@/lib/api/client";
import { type ConversionRecord, toConversionRecord } from "@/lib/api/mappers";
import { mergeHistory } from "@/lib/history";
import { loadLocalHistory, saveLocalHistory } from "@/lib/historyStorage";
import type { LockedQuote } from "./useQuote";

export type ConfirmState =
  | { phase: "idle" }
  | { phase: "submitting"; quoteId: string }
  | { phase: "done"; receipt: ConversionRecord }
  | { phase: "failed"; quoteId: string; error: ApiError };


 //Three layers stop a conversion running twice:
 //1. a ref checked synchronously, so a double-click or repeated Enter before re-render is ignored;
 //2. the button is disabled while submitting;
 //3. one idempotency key per quote, so even a retried request can only convert once on the server.

export function useConfirmConversion() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConfirmState>({ phase: "idle" });
  const inFlight = useRef(false);
  const idempotencyKeys = useRef(new Map<string, string>());

  async function confirm(quote: LockedQuote) {
    if (inFlight.current) return;
    inFlight.current = true;

    let idempotencyKey = idempotencyKeys.current.get(quote.id);
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      idempotencyKeys.current.set(quote.id, idempotencyKey);
    }

    setState({ phase: "submitting", quoteId: quote.id });
    try {
      const response = await createConversion({ quoteId: quote.id, idempotencyKey });
      saveLocalHistory(mergeHistory([response], loadLocalHistory()));
      setState({ phase: "done", receipt: toConversionRecord(response) });
    } catch (error) {
      setState({ phase: "failed", quoteId: quote.id, error: toApiError(error) });
    } finally {
      inFlight.current = false;
      //Always re-read from the server: it is the source of truth for balances, success or failure.
      void queryClient.invalidateQueries({ queryKey: ["balances"] });
      void queryClient.invalidateQueries({ queryKey: ["conversions"] });
    }
  }

  function reset() {
    setState({ phase: "idle" });
  }

  return { state, confirm, reset };
}
