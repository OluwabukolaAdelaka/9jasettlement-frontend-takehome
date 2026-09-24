import { Money } from "@/components/ui/Money";
import { formatRate } from "@/domain/rates";
import type { ConversionRecord } from "@/lib/api/mappers";
import { formatDateTime } from "@/lib/formatTime";

//Every amount is rendered through the same Money formatter as the quote, from the server's exact values.
export function Receipt({ record }: { record: ConversionRecord }) {
  const { sell, buy } = record;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-ink-muted">You sent</dt>
      <dd className="text-right font-medium">
        <Money minor={record.sellAmount} currency={sell} />
      </dd>

      <dt className="text-ink-muted">You received</dt>
      <dd className="text-right font-semibold">
        <Money minor={record.buyAmount} currency={buy} />
      </dd>

      <dt className="text-ink-muted">Rate</dt>
      <dd className="text-right tabular-nums">
        1 {sell} = {formatRate(record.rate)} {buy}
      </dd>

      <dt className="text-ink-muted">Fee</dt>
      <dd className="text-right">
        <Money minor={record.fee} currency={sell} />
      </dd>

      <dt className="text-ink-muted">Total debited</dt>
      <dd className="text-right font-medium">
        <Money minor={record.sellAmount + record.fee} currency={sell} />
      </dd>

      <dt className="text-ink-muted">Date</dt>
      <dd className="text-right">
        <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time>
      </dd>

      <dt className="text-ink-muted">Reference</dt>
      <dd className="text-right font-mono text-xs break-all">{record.id}</dd>
    </dl>
  );
}
