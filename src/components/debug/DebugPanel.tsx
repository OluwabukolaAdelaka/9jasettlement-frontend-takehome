"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useDebugAction, useDebugState } from "@/hooks/useDebug";
import type { DebugActionRequest } from "@/lib/api/types";

//Only rendered with ?debug=1, so reviewers can force failure paths without waiting for random errors.
export function DebugPanelGate() {
  const params = useSearchParams();
  return params.get("debug") === "1" ? <DebugPanel /> : null;
}

function DebugPanel() {
  const debug = useDebugState();
  const action = useDebugAction();
  const run = (request: DebugActionRequest) => action.mutate(request);

  const outage = debug.data?.ratesOutage ?? false;
  const expiryArmed = debug.data?.forceNextConversionExpired ?? false;
  const busy = action.isPending;

  return (
    <aside
      aria-label="Debug panel"
      className="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-80"
    >
      <details className="rounded-xl border-2 border-dashed border-warn-line bg-surface shadow-lg">
        <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold">Debug panel</summary>

        <div className="flex flex-col gap-4 border-t border-line px-4 py-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Rates outage</p>
              <p className="text-xs text-ink-muted">Every /api/rates request returns 503.</p>
            </div>
            <Button
              size="sm"
              variant={outage ? "primary" : "secondary"}
              aria-pressed={outage}
              disabled={busy || !debug.data}
              onClick={() => run({ action: "setRatesOutage", enabled: !outage })}
            >
              {outage ? "On" : "Off"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Expire next conversion</p>
              <p className="text-xs text-ink-muted">The next confirm returns 410 QUOTE_EXPIRED.</p>
            </div>
            {expiryArmed ? (
              <StatusPill tone="warning">Armed</StatusPill>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !debug.data}
                onClick={() => run({ action: "forceNextConversionExpired" })}
              >
                Arm
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Reset balances</p>
              <p className="text-xs text-ink-muted">Back to the starting balances. History is kept.</p>
            </div>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => run({ action: "resetBalances" })}>
              Reset
            </Button>
          </div>

          <p role="status" className="min-h-4 text-xs text-ink-muted">
            {debug.isError
              ? "Couldn't reach the debug API."
              : action.isError
                ? action.error.message
                : action.isSuccess && action.variables.action === "resetBalances"
                  ? "Balances reset."
                  : ""}
          </p>
        </div>
      </details>
    </aside>
  );
}
