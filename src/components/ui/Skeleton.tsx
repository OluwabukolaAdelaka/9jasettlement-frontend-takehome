import { cx } from "@/lib/cx";

//Placeholder block for loading states. Hidden from screen readers; pair with an sr-only "Loading…" message.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-line", className)} />;
}
