import { CURRENCIES } from "@/domain/currency";
import { Skeleton } from "@/components/ui/Skeleton";

//Same shape as BalanceList, so nothing jumps when the real rows arrive.
export function BalanceListSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading balances…</span>
      <ul aria-hidden="true" className="divide-y divide-line rounded-xl border border-line">
        {CURRENCIES.map((currency) => (
          <li key={currency} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-11 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
            <Skeleton className="h-4 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}
