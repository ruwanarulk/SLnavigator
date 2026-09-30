import { formatDuration } from "@sln/core";
import Link from "next/link";
import type { LocationCard } from "@/lib/types";
import { Rating } from "./ui/primitives";
import { SceneArt } from "./ui/scene-art";

export function PlaceCard({ place }: { place: LocationCard }) {
  return (
    <Link href={`/places/${place.slug}`} className="group block overflow-hidden rounded-card bg-card transition hover:shadow-float">
      <SceneArt hue={place.hue} imageUrl={place.imageUrl} label={place.name} className="aspect-[4/3]" />
      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{place.name}</h3>
          <Rating value={place.rating} />
        </div>
        <p className="text-[12px] text-label2">
          <span className="capitalize">{place.category}</span> · ~{formatDuration(place.avgDurationMin)}
          {place.entryFeeUsd ? ` · ~$${place.entryFeeUsd}` : " · Free"}
        </p>
        <p className="line-clamp-2 text-[13px] text-label2">{place.summary}</p>
      </div>
    </Link>
  );
}
