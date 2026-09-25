"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RefreshIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { useConversions } from "@/hooks/useConversions";
import { HistoryList } from "./HistoryList";

export function HistoryCard() {
  return (
    <Card id="history" title="History" description="Completed conversions, newest first. Select one to see its receipt.">
      <HistoryContent />
    </Card>
  );
}

function HistoryContent() {
  const history = useConversions();

  if (history.isPending) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading history…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (history.isError && !history.data) {
    return (
      <StateMessage
        kind="error"
        title="We couldn't load your history"
        description="Your conversions are safe. Try again in a moment."
        action={
          <Button variant="secondary" size="sm" loading={history.isFetching} onClick={() => void history.refetch()}>
            {!history.isFetching && <RefreshIcon />}
            Try again
          </Button>
        }
      />
    );
  }

  if (!history.data || history.data.length === 0) {
    return (
      <StateMessage
        kind="empty"
        title="No conversions yet"
        description="When you convert money, it will show up here with its receipt."
      />
    );
  }

  return <HistoryList records={history.data} />;
}
