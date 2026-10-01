"use client";

import {
  DEFAULT_BUDGET,
  estimateLeg,
  legTerrain,
  tripDays,
  type BudgetSettings,
  type TransportMode,
} from "@sln/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { loadDraft, saveDraft, type LocalDraft } from "@/lib/draft";
import type { LocationCard, Trip, TripStop } from "@/lib/types";

export interface PlannerState {
  title: string;
  startDate: string | null;
  travelers: number;
  budgetSettings: BudgetSettings;
  stops: TripStop[];
}

export type SaveState = "idle" | "saving" | "saved" | "error" | "local";
type Meta = Partial<Omit<PlannerState, "stops" | "budgetSettings">> & { budgetSettings?: Partial<BudgetSettings> };

/** Identifies what a leg was computed for, so edits only invalidate the legs they touch. */
const legKey = (s: TripStop, next: TripStop) => `${next.location.id}:${s.modeToNext}`;

/** Keeps still-valid legs and estimates the rest, so the route rail updates instantly. */
function refreshLegs(stops: TripStop[]): TripStop[] {
  return stops.map((s, i) => {
    const next = stops[i + 1];
    if (!next) return { ...s, leg: null, legFor: undefined };
    const key = legKey(s, next);
    if (s.leg && s.legFor === key) return s;
    return { ...s, leg: estimateLeg(s.location, next.location, s.modeToNext, legTerrain(s.location.region, next.location.region)), legFor: key };
  });
}

function fromTrip(t: Trip): PlannerState {
  const stops = t.stops.map((s, i) => (t.stops[i + 1] ? { ...s, legFor: legKey(s, t.stops[i + 1]) } : s));
  return { title: t.title, startDate: t.startDate, travelers: t.travelers, budgetSettings: t.budgetSettings, stops: refreshLegs(stops) };
}

function fromDraft(): PlannerState {
  const d = loadDraft();
  if (!d) return { title: "My Sri Lanka trip", startDate: null, travelers: 2, budgetSettings: DEFAULT_BUDGET, stops: [] };
  return {
    title: d.title,
    startDate: d.startDate,
    travelers: d.travelers,
    budgetSettings: { ...DEFAULT_BUDGET, ...d.budgetSettings },
    stops: refreshLegs(d.stops),
  };
}

/**
 * Planner state for either a saved trip (changes autosave to the API) or a
 * local draft before sign-up (persisted to localStorage).
 */
export function usePlanner(trip: Trip | null) {
  // Local drafts only render client-side (see LocalPlanner), so reading storage here is safe.
  const [state, setStateRaw] = useState<PlannerState>(() => (trip ? fromTrip(trip) : fromDraft()));
  const [saveState, setSaveState] = useState<SaveState>(trip ? "idle" : "local");
  const ref = useRef(state);
  const stopsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaPatch = useRef<Record<string, unknown>>({});
  const tripId = trip?.id;

  const commit = useCallback((next: PlannerState) => {
    ref.current = next;
    setStateRaw(next);
  }, []);

  useEffect(() => {
    if (!trip) saveDraft({ ...(loadDraft() ?? {}), ...state } as LocalDraft);
  }, [trip, state]);

  const saveStops = useCallback(() => {
    if (!tripId) return;
    if (stopsTimer.current) clearTimeout(stopsTimer.current);
    setSaveState("saving");
    stopsTimer.current = setTimeout(async () => {
      const sent = ref.current.stops;
      try {
        const saved = await api<Trip>(`/trips/${tripId}/stops`, {
          method: "PUT",
          json: { stops: sent.map((s) => ({ locationId: s.location.id, nights: s.nights, modeToNext: s.modeToNext })) },
        });
        // Adopt server legs (possibly Google-routed) only if nothing changed meanwhile.
        if (ref.current.stops === sent) {
          commit({
            ...ref.current,
            stops: sent.map((s, i) => ({ ...s, id: saved.stops[i]?.id, leg: saved.stops[i]?.leg ?? s.leg })),
          });
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
  }, [tripId, commit]);

  const saveMeta = useCallback(
    (patch: Record<string, unknown>) => {
      if (!tripId) return;
      metaPatch.current = { ...metaPatch.current, ...patch };
      if (metaTimer.current) clearTimeout(metaTimer.current);
      setSaveState("saving");
      metaTimer.current = setTimeout(async () => {
        const body = metaPatch.current;
        metaPatch.current = {};
        try {
          await api(`/trips/${tripId}`, { method: "PATCH", json: body });
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      }, 400);
    },
    [tripId],
  );

  const setStops = useCallback(
    (update: (stops: TripStop[]) => TripStop[]) => {
      commit({ ...ref.current, stops: refreshLegs(update(ref.current.stops)) });
      saveStops();
    },
    [commit, saveStops],
  );

  const setMeta = useCallback(
    (patch: Meta) => {
      const cur = ref.current;
      const budgetSettings = { ...cur.budgetSettings, ...patch.budgetSettings };
      commit({ ...cur, ...patch, budgetSettings });
      for (const field of [...Object.keys(patch.budgetSettings ?? {}), ...(patch.travelers !== undefined ? ["travelers"] : [])]) {
        track("budget_adjusted", { field });
      }
      const { budgetSettings: b, ...rest } = patch;
      saveMeta({ ...rest, ...(b ? { budget: budgetSettings } : {}) });
    },
    [commit, saveMeta],
  );

  const actions = useMemo(
    () => ({
      addStop: (location: LocationCard, afterIndex?: number) =>
        setStops((stops) => {
          const copy = [...stops];
          const at = afterIndex === undefined ? stops.length : afterIndex + 1;
          // The old final stop was the departure day; it now needs a night.
          const last = copy[copy.length - 1];
          if (at === copy.length && last?.nights === 0) copy[copy.length - 1] = { ...last, nights: 1 };
          copy.splice(at, 0, {
            location,
            nights: 1,
            modeToNext: "CAR_DRIVER",
            leg: null,
          });
          return copy;
        }),
      removeStop: (index: number) => {
        setStops((stops) => stops.filter((_, i) => i !== index));
        track("stop_removed", {});
      },
      moveStop: (from: number, to: number) => {
        track("stops_reordered", {});
        setStops((stops) => {
          const copy = [...stops];
          const [s] = copy.splice(from, 1);
          copy.splice(to, 0, s);
          return copy;
        });
      },
      setNights: (index: number, nights: number) =>
        setStops((stops) => stops.map((s, i) => (i === index ? { ...s, nights: Math.max(0, Math.min(30, nights)) } : s))),
      setMode: (index: number, mode: TransportMode) => {
        setStops((stops) => stops.map((s, i) => (i === index ? { ...s, modeToNext: mode } : s)));
        track("transport_mode_changed", { mode });
      },
      replaceStops: (stops: TripStop[]) => setStops(() => stops),
      setMeta,
    }),
    [setStops, setMeta],
  );

  const days = state.stops.length ? tripDays(state.stops.map((s) => s.nights)) : 0;
  const travelMin = state.stops.reduce((sum, s) => sum + (s.leg?.durationMin ?? 0), 0);

  return { state, actions, days, travelMin, saveState };
}

export type PlannerActions = ReturnType<typeof usePlanner>["actions"];
