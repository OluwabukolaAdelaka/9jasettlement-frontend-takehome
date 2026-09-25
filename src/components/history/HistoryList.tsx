"use client";

import { useState } from "react";
import { Receipt } from "@/components/receipt/Receipt";
import { Money } from "@/components/ui/Money";
import { formatRate } from "@/domain/rates";
import type { ConversionRecord } from "@/lib/api/mappers";
import { cx } from "@/lib/cx";
import { formatDateTime } from "@/lib/formatTime";

export function HistoryList({ records }: { records: ConversionRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {records.map((record) => {
        const open = openId === record.id;
        const receiptId = `receipt-${record.id}`;
        return (
          <li key={record.id}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={receiptId}
              onClick={() => setOpenId(open ? null : record.id)}
              className="flex w-full flex-col gap-1 px-3 py-3 text-left hover:bg-canvas sm:px-4"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">
                  {record.sell} → {record.buy}
                </span>
                <time dateTime={record.createdAt} className="text-xs text-ink-muted">
                  {formatDateTime(record.createdAt)}
                </time>
              </span>
              <span className="flex w-full flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span>
                  <span className="text-ink-muted">Sent </span>
                  <Money minor={record.sellAmount} currency={record.sell} />
                </span>
                <span>
                  <span className="text-ink-muted">Received </span>
                  <Money minor={record.buyAmount} currency={record.buy} className="font-semibold" />
                </span>
              </span>
              <span className="flex w-full items-center justify-between gap-2 text-xs text-ink-muted">
                <span className="tabular-nums">
                  Rate 1 {record.sell} = {formatRate(record.rate)} {record.buy}
                </span>
                <span aria-hidden="true" className={cx("transition-transform", open && "rotate-180")}>
                  ▾
                </span>
              </span>
            </button>

            {open && (
              <div id={receiptId} className="border-t border-line bg-canvas px-3 py-3 sm:px-4">
                <h3 className="mb-2 text-sm font-semibold">Receipt</h3>
                <Receipt record={record} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
