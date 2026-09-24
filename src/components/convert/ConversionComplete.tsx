"use client";

import { useEffect, useRef } from "react";
import { Receipt } from "@/components/receipt/Receipt";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import type { ConversionRecord } from "@/lib/api/mappers";

interface ConversionCompleteProps {
  receipt: ConversionRecord;
  onNewConversion: () => void;
}

export function ConversionComplete({ receipt, onNewConversion }: ConversionCompleteProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  //Move focus to the result so keyboard and screen-reader users land on it (and hear "Conversion complete").
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby="receipt-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-up-soft p-4 text-up">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <CheckIcon width={18} height={18} />
        </span>
        <div>
          <h3 id="receipt-heading" ref={headingRef} tabIndex={-1} className="font-semibold">
            Conversion complete
          </h3>
          <p className="text-sm">Your balances have been updated.</p>
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <h4 className="mb-3 text-sm font-semibold">Receipt</h4>
        <Receipt record={receipt} />
      </div>

      <Button variant="secondary" fullWidth onClick={onNewConversion}>
        Make another conversion
      </Button>
    </section>
  );
}
