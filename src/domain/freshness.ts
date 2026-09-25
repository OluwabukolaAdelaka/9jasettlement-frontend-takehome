export const STALE_AFTER_MS = 15_000;

//Uses the client's time to avoid clock differences making fresh data look stale.
export function isStale(lastUpdatedMs: number, nowMs: number, staleAfterMs: number = STALE_AFTER_MS): boolean {
  return nowMs - lastUpdatedMs > staleAfterMs;
}
