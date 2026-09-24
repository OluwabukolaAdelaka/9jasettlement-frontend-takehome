"use client";

import { useEffect, useState } from "react";

//Re-reads the current time regularly and when the tab becomes visible.
//The interval triggers a re-render; Date.now() gets the actual current time.
export function useNow(intervalMs: number = 1_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
