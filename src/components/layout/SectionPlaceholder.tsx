import { Skeleton } from "@/components/ui/Skeleton";

//Temporary content for sections that are not built yet. To be removed as each feature lands.
export function SectionPlaceholder({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="sr-only">Coming soon</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
