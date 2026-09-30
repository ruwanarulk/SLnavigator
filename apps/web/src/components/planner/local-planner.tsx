"use client";

import type { LocationCard } from "@/lib/types";
import { useIsClient } from "@/lib/use-client";
import { Skeleton } from "../ui/primitives";
import { Planner } from "./planner";

/** Local drafts live in localStorage, so the planner renders only once on the client. */
export function LocalPlanner({ places }: { places: LocationCard[] }) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="grid gap-4 p-5 md:h-[calc(100dvh-64px)] md:grid-cols-[360px_1fr]" aria-busy="true" aria-label="Loading planner">
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-[52dvh] md:h-full" />
      </div>
    );
  }
  return <Planner trip={null} places={places} />;
}
