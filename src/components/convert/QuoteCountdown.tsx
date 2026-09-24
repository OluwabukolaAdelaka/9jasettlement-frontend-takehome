import { ClockIcon } from "@/components/ui/icons";
import { secondsToShow } from "@/domain/quote";
import { cx } from "@/lib/cx";

interface QuoteCountdownProps {
  msRemaining: number;
  totalMs: number;
}

export function QuoteCountdown({ msRemaining, totalMs }: QuoteCountdownProps) {
  const seconds = secondsToShow(msRemaining);
  const expired = msRemaining === 0;
  const urgent = !expired && seconds <= 10;
  const fraction = totalMs > 0 ? Math.min(1, msRemaining / totalMs) : 0;

  return (
    <div className="flex min-w-32 flex-col items-end gap-1">
      <p
        className={cx(
          "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
          expired ? "text-down" : urgent ? "text-warn" : "text-brand",
        )}
      >
        <ClockIcon width={14} height={14} />
        {expired ? "Expired" : `${seconds}s left`}
      </p>
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className={cx("h-full rounded-full", expired ? "bg-down" : urgent ? "bg-warn" : "bg-brand")}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
