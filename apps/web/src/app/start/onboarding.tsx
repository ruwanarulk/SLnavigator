"use client";

import { INTERESTS, type BudgetLevel, type StayTier } from "@sln/core";
import clsx from "clsx";
import { Check, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/layout/session";
import { Button, Chip, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { emptyDraft, saveDraft, saveInterests } from "@/lib/draft";
import type { LocationCard, Trip } from "@/lib/types";

const LENGTHS = [
  { label: "5 days", days: 5 },
  { label: "7 days", days: 7 },
  { label: "9–10", days: 10 },
  { label: "14+", days: 14 },
];

const LEVELS: { id: BudgetLevel; label: string; stay: StayTier }[] = [
  { id: "shoestring", label: "Shoestring", stay: "guesthouse" },
  { id: "comfortable", label: "Comfortable", stay: "boutique" },
  { id: "splurge", label: "Splurge", stay: "luxury" },
];

interface StarterStop {
  locationId: string;
  nights: number;
  modeToNext: Trip["stops"][number]["modeToNext"];
  location: LocationCard;
}

export function Onboarding() {
  const router = useRouter();
  const { user } = useSession();
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);
  const [days, setDays] = useState(10);
  const [level, setLevel] = useState<BudgetLevel>("comfortable");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => setInterests((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]));

  async function go(withRoute: boolean) {
    setBusy(true);
    setError(null);
    try {
      saveInterests(interests);
      const tier = LEVELS.find((l) => l.id === level)!;
      const budget = { stayTier: tier.stay, foodLevel: level, guideDays: 0, bufferPct: 10 };
      const stops: StarterStop[] = withRoute
        ? (await api<{ stops: StarterStop[] }>("/planner/starter", { method: "POST", json: { interests, days } })).stops
        : [];

      if (user) {
        await api("/me", { method: "PATCH", json: { interests } }).catch(() => {});
        const trip = await api<Trip>("/trips", {
          method: "POST",
          json: {
            title: "My Sri Lanka trip",
            budget,
            stops: stops.map((s) => ({ locationId: s.locationId, nights: s.nights, modeToNext: s.modeToNext })),
          },
        });
        router.push(`/plan/${trip.id}`);
      } else {
        saveDraft({
          ...emptyDraft(),
          budgetSettings: budget,
          stops: stops.map((s) => ({ location: s.location, nights: s.nights, modeToNext: s.modeToNext, leg: null })),
        });
        router.push("/plan");
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-10 md:pt-16">
      <div className="mb-6 grid size-12 place-items-center rounded-tile bg-accent text-on-accent">
        <Compass aria-hidden className="size-6" />
      </div>
      <DisplayHeading as="h1" className="text-[44px] md:text-[56px]">
        What pulls you to the island?
      </DisplayHeading>
      <p className="mt-3 text-[16px] text-label2">Pick a few and we&apos;ll start your map with stops that fit. You can change this any time.</p>

      <fieldset className="mt-8">
        <legend className="sr-only">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip key={i.id} active={interests.includes(i.id)} onClick={() => toggle(i.id)} className="h-10 px-4 text-[14px]">
              {interests.includes(i.id) && <Check aria-hidden className="size-4" />}
              {i.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <Segment label="Trip length" options={LENGTHS.map((l) => [String(l.days), l.label])} value={String(days)} onChange={(v) => setDays(Number(v))} />
      <Segment label="Budget per person" options={LEVELS.map((l) => [l.id, l.label])} value={level} onChange={(v) => setLevel(v as BudgetLevel)} />

      {error && (
        <p role="alert" className="mt-6 rounded-tile bg-danger-t p-3 text-[14px] text-danger">
          {error}
        </p>
      )}

      <div className="glass fixed inset-x-0 bottom-14 z-30 border-t border-sep p-3 md:static md:mt-10 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button variant="secondary" size="lg" className="flex-1" disabled={busy} onClick={() => go(false)}>
            Open the Map
          </Button>
          <Button size="lg" className="flex-[1.4]" disabled={busy || interests.length === 0} onClick={() => go(true)}>
            {busy ? "Building your route…" : interests.length ? `Build My Route · ${days} days` : "Pick an interest"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Segment({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="mb-2 text-[15px] font-semibold">{label}</legend>
      <div className={clsx("grid gap-1 rounded-full bg-fill p-1", options.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={clsx("h-10 rounded-full text-[14px] font-medium transition", value === v ? "bg-card shadow-sm" : "text-label2 hover:text-label")}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
