import { formatMoney } from "@sln/core";
import Link from "next/link";
import type { Itinerary } from "@/lib/types";
import { SceneArt } from "./ui/scene-art";

export function MiniLine({ from, to, count }: { from: string; to: string; count: number }) {
  return (
    <div aria-label={`${count} stops from ${from} to ${to}`}>
      <div className="relative flex items-center justify-between">
        <span className="absolute inset-x-1 top-1/2 h-[3px] -translate-y-1/2 bg-accent" />
        {Array.from({ length: Math.min(count, 8) }).map((_, i, a) => (
          <span
            key={i}
            className={`relative block size-2.5 border-2 border-accent bg-card ${i === 0 || i === a.length - 1 ? "rounded-[2px]" : "rounded-full"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
        <span className="font-display tracking-wide">{from.toUpperCase()}</span>
        <span className="text-label2">{count} stops</span>
        <span className="font-display tracking-wide">{to.toUpperCase()}</span>
      </div>
    </div>
  );
}

export function ItineraryCard({ it, fromUsd }: { it: Itinerary; fromUsd?: number }) {
  const first = it.stops[0]?.location.name ?? "";
  const last = it.stops[it.stops.length - 1]?.location.name ?? "";
  return (
    <Link href={`/itineraries/${it.slug}`} className="group block overflow-hidden rounded-card bg-card transition hover:shadow-float">
      <SceneArt hue={it.hue} label={it.title} className="aspect-[16/10] transition group-hover:brightness-105" />
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-[17px] font-semibold">{it.title}</h3>
          <p className="text-[13px] text-label2">{it.stops.map((s) => s.location.name).filter((n, i, a) => a.indexOf(n) === i).join(", ")}</p>
        </div>
        <MiniLine from={first} to={last} count={it.stops.length} />
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-label2">
            {it.days} days{fromUsd ? ` · from ${formatMoney(fromUsd, "USD")} pp` : ""}
          </span>
          <span className="font-semibold text-accent-ink">Customize →</span>
        </div>
      </div>
    </Link>
  );
}
