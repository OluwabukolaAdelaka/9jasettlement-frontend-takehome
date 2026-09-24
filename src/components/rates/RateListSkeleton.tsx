import { Skeleton } from "@/components/ui/Skeleton";


export function RateListSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading rates…</span>
      <ul aria-hidden="true" className="divide-y divide-line rounded-xl border border-line">
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-11 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
