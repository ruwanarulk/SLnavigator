import { DEFAULT_BUDGET, estimateBudget, estimateLeg, legTerrain } from "@sln/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripMap } from "@/components/map/trip-map";
import { TheLine } from "@/components/planner/the-line";
import { Card, DisplayHeading, Pill } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Itinerary, TripStop } from "@/lib/types";
import { CustomizeButton } from "./customize-button";
import { PriceFrom } from "./price-from";

async function load(slug: string) {
  try {
    return await serverApi<Itinerary>(`/itineraries/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata(props: PageProps<"/itineraries/[slug]">): Promise<Metadata> {
  const it = await load((await props.params).slug);
  return { title: it.title, description: it.summary };
}

export default async function ItineraryPage(props: PageProps<"/itineraries/[slug]">) {
  const it = await load((await props.params).slug);
  const stops: TripStop[] = it.stops.map((s, i) => {
    const next = it.stops[i + 1];
    return { ...s, leg: next ? estimateLeg(s.location, next.location, s.modeToNext, legTerrain(s.location.region, next.location.region)) : null };
  });
  const budget = estimateBudget({
    travelers: 2,
    nights: stops.reduce((a, s) => a + s.nights, 0),
    entryFeesPerPerson: stops.map((s) => s.location.entryFeeUsd),
    legs: stops.slice(0, -1).map((s) => ({ mode: s.modeToNext, distanceKm: s.leg?.distanceKm ?? 0 })),
    settings: { ...DEFAULT_BUDGET, stayTier: "guesthouse", foodLevel: "comfortable" },
  });

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <div>
            <div className="flex gap-2">
              <Pill tone="accent">{it.days} days</Pill>
              {it.tags.map((t) => (
                <Pill key={t} className="capitalize">
                  {t}
                </Pill>
              ))}
            </div>
            <DisplayHeading as="h1" className="mt-3 text-[48px]">
              {it.title}
            </DisplayHeading>
            <p className="mt-2 text-[16px] text-label2">{it.summary}</p>
          </div>
          <Card className="flex items-center justify-between p-5">
            <div>
              <p className="text-[12px] text-label2">Guesthouse budget, 2 travellers</p>
              <PriceFrom usd={budget.perPerson} />
            </div>
            <CustomizeButton it={it} />
          </Card>
          <Card className="p-5">
            <TheLine stops={stops} readOnly />
          </Card>
        </div>
        <TripMap className="h-[420px] rounded-card lg:sticky lg:top-24 lg:h-[calc(100dvh-140px)]" places={[]} route={stops} routeOnly />
      </div>
    </div>
  );
}
