import { formatDuration, REGIONS, seasonFor, type Region } from "@sln/core";
import clsx from "clsx";
import { AlertTriangle, Accessibility, Clock, Hourglass, MapPin, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToTrip } from "@/components/add-to-trip";
import { PlaceCard } from "@/components/place-card";
import { Card, DisplayHeading, Pill, Rating } from "@/components/ui/primitives";
import { SceneArt } from "@/components/ui/scene-art";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { LocationDetail } from "@/lib/types";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

async function load(slug: string) {
  try {
    return await serverApi<LocationDetail>(`/locations/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata(props: PageProps<"/places/[slug]">): Promise<Metadata> {
  const p = await load((await props.params).slug);
  return { title: p.name, description: p.summary };
}

export default async function PlacePage(props: PageProps<"/places/[slug]">) {
  const place = await load((await props.params).slug);
  const region = REGIONS.find((r) => r.id === place.region)?.label ?? place.region;
  const local = [place.nameSi, place.nameTa].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto max-w-[1100px] px-4 pb-24 pt-6 md:px-8">
      <SceneArt hue={place.hue} imageUrl={place.imageUrl} label={place.name} className="aspect-[16/7] rounded-[28px]" />
      <div className="mt-6 grid gap-8 md:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-[13px] text-label2">
              <MapPin aria-hidden className="mr-1 inline size-3.5" />
              {region} · <span className="capitalize">{place.category}</span>
            </p>
            <DisplayHeading as="h1" className="mt-1 text-[48px]">
              {place.name}
            </DisplayHeading>
            {local && <p className="font-local text-[15px] text-label2">{local}</p>}
            <div className="mt-2 flex items-center gap-3">
              <Rating value={place.rating} count={place.reviewCount} />
              {place.tags.map((t) => (
                <Pill key={t} tone="accent" className="capitalize">
                  {t}
                </Pill>
              ))}
            </div>
          </div>
          <AddToTrip place={place} />
          <p className="text-[17px] leading-relaxed">{place.summary}</p>
          <p className="leading-relaxed text-label2">{place.description}</p>

          {(place.safety || place.accessibility) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {place.safety && (
                <Card className="flex gap-3 p-4">
                  <AlertTriangle aria-hidden className="size-5 shrink-0 text-signal-ink" />
                  <div>
                    <p className="text-[14px] font-semibold">Safety</p>
                    <p className="text-[13px] text-label2">{place.safety}</p>
                  </div>
                </Card>
              )}
              {place.accessibility && (
                <Card className="flex gap-3 p-4">
                  <Accessibility aria-hidden className="size-5 shrink-0 text-accent-ink" />
                  <div>
                    <p className="text-[14px] font-semibold">Accessibility</p>
                    <p className="text-[13px] text-label2">{place.accessibility}</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="divide-y divide-sep p-5 text-[14px]">
            <Fact icon={Ticket} label="Entry fee" value={place.entryFeeUsd ? `~$${place.entryFeeUsd} per person` : "Free"} />
            <Fact icon={Clock} label="Opening hours" value={place.openingHours ?? "Varies"} />
            <Fact icon={Hourglass} label="Time needed" value={`About ${formatDuration(place.avgDurationMin)}`} />
            {place.bestTime && <Fact icon={MapPin} label="Best time" value={place.bestTime} />}
          </Card>
          <Card className="p-5">
            <p className="mb-2 text-[14px] font-semibold">Weather by month</p>
            <div className="grid grid-cols-12 gap-1" role="list" aria-label="Season by month">
              {MONTHS.map((m, i) => {
                const s = seasonFor(place.region as Region, i);
                return (
                  <div key={i} role="listitem" aria-label={`Month ${i + 1}: ${s}`} className="text-center">
                    <div className={clsx("h-7 rounded", s === "dry" ? "bg-accent" : s === "shoulder" ? "bg-accent/40" : "bg-sep")} />
                    <span className="text-[10px] text-label2">{m}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-label2">Dark = dry season · light = shoulder · grey = monsoon</p>
          </Card>
          {place.amenities.length > 0 && (
            <Card className="p-5">
              <p className="mb-2 text-[14px] font-semibold">Nearby amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {place.amenities.map((a) => (
                  <Pill key={a}>{a}</Pill>
                ))}
              </div>
            </Card>
          )}
          <p className="text-[12px] text-label2">
            {place.verifiedAt
              ? `Fees and hours checked ${new Date(place.verifiedAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}.`
              : "Fees and hours are approximate and not yet verified. Check on the day."}
          </p>
        </aside>
      </div>

      {place.nearby.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-[30px] font-semibold">Nearby</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {place.nearby.slice(0, 3).map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon aria-hidden className="mt-0.5 size-4 text-label2" />
      <div>
        <p className="text-[12px] text-label2">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
