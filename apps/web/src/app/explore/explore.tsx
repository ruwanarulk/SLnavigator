"use client";

import { CATEGORIES, INTERESTS, REGIONS, seasonFor, seasonHeadline, type Region } from "@sln/core";
import { Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TripMap } from "@/components/map/trip-map";
import { PlaceCard } from "@/components/place-card";
import { Chip, DisplayHeading } from "@/components/ui/primitives";
import type { LocationCard } from "@/lib/types";

export function Explore({ places }: { places: LocationCard[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [interest, setInterest] = useState<string | null>(null);
  const [dryOnly, setDryOnly] = useState(false);
  const month = new Date().getMonth();

  const shown = useMemo(
    () =>
      places.filter(
        (p) =>
          (!category || p.category === category) &&
          (!region || p.region === region) &&
          (!interest || p.tags.includes(interest)) &&
          (!dryOnly || seasonFor(p.region as Region, month) !== "monsoon"),
      ),
    [places, category, region, interest, dryOnly, month],
  );

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 md:px-8">
      <DisplayHeading as="h1" className="text-[44px] md:text-[56px]">
        Explore
      </DisplayHeading>
      <p className="mt-3 flex max-w-3xl items-start gap-2 rounded-tile bg-signal-t p-3 text-[14px] text-label">
        <Sun aria-hidden className="mt-0.5 size-4 shrink-0 text-signal-ink" />
        {seasonHeadline(month)}
      </p>

      <div className="mt-6 space-y-2">
        <FilterRow label="Type" items={CATEGORIES.map((c) => [c.id, c.label])} value={category} onChange={setCategory} />
        <FilterRow label="Region" items={REGIONS.map((r) => [r.id, r.label])} value={region} onChange={setRegion} />
        <FilterRow label="Interest" items={INTERESTS.map((i) => [i.id, i.label])} value={interest} onChange={setInterest}>
          <Chip active={dryOnly} onClick={() => setDryOnly((d) => !d)}>
            Dry right now
          </Chip>
        </FilterRow>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <TripMap
            className="h-[360px] rounded-card lg:h-[calc(100dvh-140px)]"
            places={shown}
            route={[]}
            onSelect={(p) => router.push(`/places/${p.slug}`)}
          />
        </div>
        <div>
          <p className="mb-3 text-[13px] text-label2" aria-live="polite">
            {shown.length} {shown.length === 1 ? "place" : "places"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
          <p id="estimates" className="mt-8 text-[12px] text-label2">
            Entry fees are approximate foreign-visitor prices in USD, and opening hours are typical. Both change often, so check on the day.
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  items,
  value,
  onChange,
  children,
}: {
  label: string;
  items: [string, string][];
  value: string | null;
  onChange: (v: string | null) => void;
  children?: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="w-16 shrink-0 text-[12px] font-medium text-label2">{label}</span>
      {items.map(([id, l]) => (
        <Chip key={id} active={value === id} onClick={() => onChange(value === id ? null : id)} className="shrink-0">
          {l}
        </Chip>
      ))}
      {children}
    </div>
  );
}
