import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@/components/ui/icons";
import type { RateDirection } from "@/domain/rates";
import { cx } from "@/lib/cx";

const STYLES: Record<RateDirection, { className: string; label: string }> = {
  up: { className: "bg-up-soft text-up", label: "Up since last update" },
  down: { className: "bg-down-soft text-down", label: "Down since last update" },
  unchanged: { className: "bg-canvas text-ink-muted", label: "Unchanged since last update" },
};


export function DirectionIndicator({ direction }: { direction: RateDirection }) {
  const style = STYLES[direction];
  return (
    <span className={cx("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full", style.className)}>
      {direction === "up" && <ArrowUpIcon width={14} height={14} />}
      {direction === "down" && <ArrowDownIcon width={14} height={14} />}
      {direction === "unchanged" && <MinusIcon width={14} height={14} />}
      <span className="sr-only">{style.label}</span>
    </span>
  );
}
