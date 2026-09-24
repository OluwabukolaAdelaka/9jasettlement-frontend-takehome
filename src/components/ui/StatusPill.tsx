import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted border-line",
  success: "bg-up-soft text-up border-up/20",
  warning: "bg-warn-soft text-warn border-warn-line",
  danger: "bg-down-soft text-down border-down/20",
  brand: "bg-brand-soft text-brand border-brand/20",
};

interface StatusPillProps {
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}


export function StatusPill({ tone = "neutral", icon, className, children }: StatusPillProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
