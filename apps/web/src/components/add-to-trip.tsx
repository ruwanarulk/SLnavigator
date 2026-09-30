"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { emptyDraft, loadDraft, saveDraft } from "@/lib/draft";
import type { LocationCard, Trip } from "@/lib/types";
import { useSession } from "./layout/session";
import { Button } from "./ui/primitives";

/** Adds a place to one of the traveller's trips, or to the local draft. */
export function AddToTrip({ place }: { place: LocationCard }) {
  const router = useRouter();
  const { user } = useSession();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [target, setTarget] = useState<string>("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<Trip[]>("/trips")
      .then((t) => {
        setTrips(t);
        setTarget(t[0]?.id ?? "new");
      })
      .catch(() => setTrips([]));
  }, [user]);

  async function add() {
    setBusy(true);
    track("stop_added", { source: "place_page" });
    try {
      if (!user) {
        const d = loadDraft() ?? emptyDraft();
        if (!d.stops.some((s) => s.location.id === place.id)) {
          d.stops.push({ location: place, nights: 1, modeToNext: "CAR_DRIVER", leg: null });
          saveDraft(d);
        }
        setDone(true);
        return;
      }
      if (target === "new") {
        const t = await api<Trip>("/trips", { method: "POST", json: { stops: [{ locationId: place.id, nights: 1, modeToNext: "CAR_DRIVER" }] } });
        track("trip_created", { source: "place_page", stops: 1 });
        router.push(`/plan/${t.id}`);
        return;
      }
      const trip = trips!.find((t) => t.id === target)!;
      const stops = trip.stops.map((s) => ({ locationId: s.location.id, nights: s.nights, modeToNext: s.modeToNext }));
      if (!stops.some((s) => s.locationId === place.id)) stops.push({ locationId: place.id, nights: 1, modeToNext: "CAR_DRIVER" });
      await api(`/trips/${trip.id}/stops`, { method: "PUT", json: { stops } });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span role="status" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ok">
          <Check className="size-4" /> Added to your trip
        </span>
        <Button variant="secondary" size="sm" onClick={() => router.push(user && target !== "new" ? `/plan/${target}` : "/plan")}>
          Open Planner
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {user && trips && trips.length > 0 && (
        <label>
          <span className="sr-only">Choose trip</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-11 rounded-full bg-fill px-4 text-[14px] font-medium">
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
            <option value="new">New trip</option>
          </select>
        </label>
      )}
      <Button onClick={add} disabled={busy || (!!user && trips === null)}>
        <Plus className="size-4" /> Add to Trip
      </Button>
    </div>
  );
}
