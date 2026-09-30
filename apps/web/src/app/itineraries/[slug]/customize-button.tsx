"use client";

import { DEFAULT_BUDGET } from "@sln/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/layout/session";
import { Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { saveDraft } from "@/lib/draft";
import type { Itinerary, Trip } from "@/lib/types";

export function CustomizeButton({ it }: { it: Itinerary }) {
  const router = useRouter();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      if (user) {
        const trip = await api<Trip>("/trips", { method: "POST", json: { itinerarySlug: it.slug } });
        router.push(`/plan/${trip.id}`);
      } else {
        saveDraft({
          title: it.title,
          startDate: null,
          travelers: 2,
          budgetSettings: DEFAULT_BUDGET,
          itinerarySlug: it.slug,
          stops: it.stops.map((s) => ({ location: s.location, nights: s.nights, modeToNext: s.modeToNext, leg: null })),
        });
        router.push("/plan");
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <Button size="lg" onClick={go} disabled={busy}>
      {busy ? "Opening planner…" : "Customize This Route"}
    </Button>
  );
}
