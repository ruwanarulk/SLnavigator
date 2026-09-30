import { REGIONS } from "@sln/core";
import { Clock } from "lucide-react";
import Link from "next/link";
import type { Provider } from "@/lib/types";
import { Pill, Rating, SampleBadge, VerifiedBadge } from "./ui/primitives";

export const TYPE_LABEL = { GUIDE: "Independent guide", COMPANY: "Tour company", TRANSPORT: "Transport operator" } as const;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function replyTime(min: number | null) {
  if (!min) return null;
  return min < 60 ? `Replies in ~${min} min` : `Replies in ~${Math.round(min / 60)} h`;
}

export function ProviderCard({ p }: { p: Provider }) {
  const areas = p.areas.map((a) => REGIONS.find((r) => r.id === a)?.label ?? a).join(", ");
  return (
    <Link href={`/guides/${p.slug}`} className="block rounded-card bg-card p-5 transition hover:shadow-float">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-t font-semibold text-accent-ink">
          {initials(p.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{p.displayName}</p>
          <p className="text-[13px] text-label2">
            {TYPE_LABEL[p.type]} · {p.city}
          </p>
        </div>
        {p.reviewCount > 0 && <Rating value={p.rating} count={p.reviewCount} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.verificationStatus === "APPROVED" && <VerifiedBadge />}
        {p.isSample && <SampleBadge />}
        {p.reviewCount < 5 && <Pill tone="signal">New provider</Pill>}
        {p.specialties.slice(0, 3).map((s) => (
          <Pill key={s}>{s}</Pill>
        ))}
      </div>
      <p className="mt-3 line-clamp-2 text-[13px] text-label2">{p.bio}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-label2">
        <span>{p.languages.join(", ")}</span>
        {replyTime(p.responseTimeMin) && (
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" /> {replyTime(p.responseTimeMin)}
          </span>
        )}
        <span>{areas}</span>
      </div>
    </Link>
  );
}
