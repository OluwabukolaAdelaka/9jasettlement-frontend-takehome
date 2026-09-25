"use client";

import { isStale } from "@/domain/freshness";
import { useNow } from "@/hooks/useNow";
import { formatTime } from "@/lib/formatTime";
import { cx } from "@/lib/cx";
import { AlertIcon, ClockIcon } from "./icons";
import { StatusPill } from "./StatusPill";

interface FreshnessStatusProps {
  updatedAt: number | undefined;
  retrying: boolean;
  className?: string;
}

export function FreshnessStatus({ updatedAt, retrying, className }: FreshnessStatusProps) {
  const now = useNow();
  const hasData = updatedAt !== undefined && updatedAt > 0;
  const stale = hasData && isStale(updatedAt, now);

  return (
    <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted", className)}>
      <span className="inline-flex items-center gap-1">
        <ClockIcon width={14} height={14} />
        {hasData ? (
          <>
            Updated <time dateTime={new Date(updatedAt).toISOString()}>{formatTime(updatedAt)}</time>
          </>
        ) : (
          "Updating…"
        )}
      </span>
      {/* Always rendered, so the badge is announced once when it appears, not on every poll. */}
      <span aria-live="polite">
        {stale && (
          <StatusPill tone="warning" icon={<AlertIcon width={12} height={12} />}>
            Stale: rates may be out of date{retrying ? ", retrying…" : ""}
          </StatusPill>
        )}
      </span>
    </div>
  );
}
