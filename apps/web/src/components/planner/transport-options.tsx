"use client";

import { estimateLeg, formatDuration, legCost, legTerrain, TRANSPORT_MODES, type TransportMode } from "@sln/core";
import clsx from "clsx";
import { Info } from "lucide-react";
import type { TripStop } from "@/lib/types";
import { useSession } from "../layout/session";
import { ModeIcon } from "./mode-icon";

/**
 * "Book it myself", Phase 1: per-leg comparison of every mode with rough cost
 * and time. Choosing a mode updates the plan; in-app booking arrives in Phase 3.
 */
export function TransportOptions({
  stops,
  travelers,
  onMode,
}: {
  stops: TripStop[];
  travelers: number;
  onMode: (index: number, mode: TransportMode) => void;
}) {
  const { money } = useSession();
  const legs = stops.slice(0, -1);

  return (
    <div className="space-y-5">
      <p className="flex gap-2 rounded-tile bg-accent-t p-3 text-[13px] text-accent-ink">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        In-app booking for cars, trains and buses is coming. For now, compare options per leg and pick one for your plan and budget.
      </p>
      {legs.map((s, i) => {
        const next = stops[i + 1];
        return (
          <section key={`${s.location.id}-${i}`} aria-label={`${s.location.name} to ${next.location.name}`}>
            <h3 className="mb-2 font-display text-[18px] font-bold tracking-wide">
              {s.location.name.toUpperCase()} → {next.location.name.toUpperCase()}
            </h3>
            <div className="grid gap-1.5">
              {TRANSPORT_MODES.map((m) => {
                const est = estimateLeg(s.location, next.location, m.id, legTerrain(s.location.region, next.location.region));
                const km = s.modeToNext === m.id && s.leg ? s.leg.distanceKm : est.distanceKm;
                const min = s.modeToNext === m.id && s.leg ? s.leg.durationMin : est.durationMin;
                const selected = s.modeToNext === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onMode(i, m.id)}
                    aria-pressed={selected}
                    className={clsx(
                      "flex items-center gap-3 rounded-tile border px-3 py-2.5 text-left text-[14px] transition",
                      selected ? "border-accent bg-accent-t" : "border-sep hover:bg-fill",
                    )}
                  >
                    <ModeIcon mode={m.id} className="size-5 text-accent-ink" />
                    <span className="flex-1 font-medium">{m.label}</span>
                    <span className="tabular-nums text-label2">~{formatDuration(min)}</span>
                    <span className="w-20 text-right font-semibold tabular-nums">{money(Math.round(legCost({ mode: m.id, distanceKm: km }, travelers)))}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-[12px] text-label2">
        Rough costs for {travelers} {travelers === 1 ? "traveller" : "travellers"}. Train and bus fares are per person; cars and tuk-tuks are per vehicle. Self-drive requires a
        Sri Lankan driving permit.
      </p>
    </div>
  );
}
