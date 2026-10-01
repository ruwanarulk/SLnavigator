import { Star } from "lucide-react";
import { Card, Rating } from "../ui/primitives";
import { fmtDate } from "../marketplace/shared";

export interface PublicReviews {
  count: number;
  rating: number;
  recommendPct: number;
  breakdown: Record<string, number>;
  criteria: { id: string; label: string }[];
  items: { id: string; overall: number; recommend: boolean; text: string; travellerName: string; tripTitle: string; month: string }[];
}

/** Revealed traveller reviews on a provider's public profile. */
export function ProviderReviews({ data }: { data: PublicReviews }) {
  if (data.count === 0) {
    return (
      <Card className="p-5 text-[14px] text-label2">
        No reviews yet. Travellers can review after a trip booked through Navigator, and only completed bookings count.
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Star aria-hidden className="size-6 fill-signal text-signal" />
          <span className="font-display text-[32px] font-semibold leading-none tabular-nums">{data.rating.toFixed(1)}</span>
        </div>
        <p className="text-[13px] text-label2">
          {data.count} {data.count === 1 ? "review" : "reviews"} · {data.recommendPct}% recommend
        </p>
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        {data.criteria.map((c) => (
          <li key={c.id} className="flex justify-between">
            <span className="text-label2">{c.label}</span>
            <span className="font-medium tabular-nums">{data.breakdown[c.id]?.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 divide-y divide-sep">
        {data.items.map((r) => (
          <li key={r.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-medium">{r.travellerName}</p>
              <Rating value={r.overall} />
            </div>
            <p className="text-[12px] text-label2">
              {r.tripTitle} · {fmtDate(r.month, { month: "long", year: "numeric" })}
            </p>
            {r.text && <p className="mt-1.5 text-[14px] leading-relaxed">{r.text}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
