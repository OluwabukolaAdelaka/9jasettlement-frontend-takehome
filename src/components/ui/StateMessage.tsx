import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { AlertIcon, InboxIcon } from "./icons";

interface StateMessageProps {
  kind: "empty" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}


export function StateMessage({ kind, title, description, action, className }: StateMessageProps) {
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cx(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center",
        isError ? "border-down/30 bg-down-soft" : "border-line-strong bg-canvas",
        className,
      )}
    >
      <span
        className={cx(
          "flex h-9 w-9 items-center justify-center rounded-full",
          isError ? "bg-surface text-down" : "bg-surface text-ink-muted",
        )}
      >
        {isError ? <AlertIcon width={18} height={18} /> : <InboxIcon width={18} height={18} />}
      </span>
      <p className={cx("font-medium", isError ? "text-down" : "text-ink")}>{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
