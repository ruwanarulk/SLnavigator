"use client";

import clsx from "clsx";
import { ArrowLeft, Clock, Languages, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/layout/session";
import { fmtRange, initials, InclusionChips, needLabel, ProgressSteps, responseLabel, timeLeft, useNow } from "@/components/marketplace/shared";
import { Button, Card, DisplayHeading, Pill, Rating, VerifiedBadge } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Trip } from "@/lib/types";

export interface OwnerBid {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  priceUsd: number;
  inclusions: string[];
  pitch: string;
  availabilityConfirmed: boolean;
  shortlisted: boolean;
  createdAt: string;
  provider: {
    id: string;
    slug: string;
    displayName: string;
    type: "GUIDE" | "COMPANY" | "TRANSPORT";
    city: string;
    rating: number;
    reviewCount: number;
    responseTimeMin: number | null;
    languages: string[];
    specialties: string[];
    yearsActive: number;
  };
}

export interface OwnerPost {
  id: string;
  status: "OPEN" | "CLOSED" | "WITHDRAWN";
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  budgetMinUsd: number;
  budgetMaxUsd: number;
  need: string;
  interests: string[];
  languages: string[];
  notes: string;
  deadline: string;
  biddingOpen: boolean;
  bids: OwnerBid[];
}

type Sort = "price" | "rating" | "newest";
const SORTS: { id: Sort; label: string }[] = [
  { id: "price", label: "Price" },
  { id: "rating", label: "Rating" },
  { id: "newest", label: "Newest" },
];
const TYPE_LABEL = { GUIDE: "Independent guide", COMPANY: "Tour company", TRANSPORT: "Transport operator" } as const;

export function BidsView({ trip, initial }: { trip: Trip; initial: OwnerPost }) {
  const router = useRouter();
  const { money } = useSession();
  const [post, setPost] = useState(initial);
  const [sort, setSort] = useState<Sort>("price");
  const [busy, setBusy] = useState(false);
  const now = useNow();
  const people = post.adults + post.children;

  // Bids arrive while you watch: refresh quietly every 20 seconds while the tab is visible.
  useEffect(() => {
    if (post.status !== "OPEN") return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      api<OwnerPost>(`/trips/${trip.id}/post`)
        .then(setPost)
        .catch(() => {});
    };
    const t = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [trip.id, post.status]);

  const bids = useMemo(() => {
    const list = [...post.bids];
    if (sort === "price") list.sort((a, b) => a.priceUsd - b.priceUsd);
    if (sort === "rating") list.sort((a, b) => b.provider.rating - a.provider.rating || b.provider.reviewCount - a.provider.reviewCount);
    if (sort === "newest") list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return list;
  }, [post.bids, sort]);

  const left = timeLeft(post.deadline, now);

  async function withdraw() {
    if (!confirm("Withdraw this request? Guides' bids will be cancelled and you can edit your plan again.")) return;
    setBusy(true);
    try {
      await api(`/trips/${trip.id}/post`, { method: "DELETE" });
      router.push(`/plan/${trip.id}`);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-28 pt-6 md:px-8">
      <Link href={`/plan/${trip.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-label2 hover:text-label">
        <ArrowLeft aria-hidden className="size-4" /> {trip.title}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <DisplayHeading as="h1" className="text-[40px]">
            Bids
          </DisplayHeading>
          <p className="text-[14px] text-label2">
            {post.bids.length} {post.bids.length === 1 ? "offer" : "offers"} · your range ${post.budgetMinUsd.toLocaleString("en-US")}–${post.budgetMaxUsd.toLocaleString("en-US")}
          </p>
        </div>
        <ProgressSteps current={2} />
      </div>

      {post.status === "OPEN" && (
        <div className={clsx("mt-5 flex flex-wrap items-center justify-between gap-3 rounded-tile px-4 py-3 text-[14px]", left ? "bg-signal-t text-signal-ink" : "bg-fill text-label2")}>
          <p className="flex items-center gap-2 font-medium">
            <Clock aria-hidden className="size-4" />
            {left ? `Bidding closes in ${left}` : "Bidding has closed"}
          </p>
          <p className="text-[13px]">
            {left ? `${new Date(post.deadline).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ` : ""}you can accept any time
          </p>
        </div>
      )}

      <Card className="mt-5 grid gap-4 p-5 text-[14px] sm:grid-cols-3">
        <div>
          <p className="text-[12px] text-label2">Dates</p>
          <p className="font-medium">{fmtRange(post.startDate, post.endDate)}</p>
        </div>
        <div>
          <p className="text-[12px] text-label2">Group</p>
          <p className="flex items-center gap-1.5 font-medium">
            <UsersRound aria-hidden className="size-4" /> {post.adults} {post.adults === 1 ? "adult" : "adults"}
            {post.children > 0 && `, ${post.children} ${post.children === 1 ? "child" : "children"}`}
          </p>
        </div>
        <div>
          <p className="text-[12px] text-label2">Looking for</p>
          <p className="font-medium">{needLabel(post.need)}</p>
        </div>
        <div className="sm:col-span-3">
          <p className="text-[12px] text-label2">Route</p>
          <p className="font-medium">{trip.stops.map((s) => s.location.name).join(" → ")}</p>
        </div>
        {post.notes && (
          <div className="sm:col-span-3">
            <p className="text-[12px] text-label2">Your notes</p>
            <p>{post.notes}</p>
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Offers</h2>
        <div role="group" aria-label="Sort offers" className="flex gap-1.5">
          {SORTS.map((s) => (
            <button key={s.id} aria-pressed={sort === s.id} onClick={() => setSort(s.id)} className={clsx("h-8 rounded-full px-3.5 text-[13px] font-medium", sort === s.id ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-sep")}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {bids.length === 0 ? (
        <Card className="mt-3 p-10 text-center">
          <p className="font-medium">No offers yet</p>
          <p className="mt-1 text-[14px] text-label2">Verified guides who cover your route have been notified. Offers usually start arriving within a few hours, and appear here automatically.</p>
        </Card>
      ) : (
        <ul className="mt-3 space-y-3">
          {bids.map((b) => (
            <li key={b.id}>
              <BidCard bid={b} people={people} price={money(b.priceUsd)} perPerson={money(Math.round(b.priceUsd / people))} />
            </li>
          ))}
        </ul>
      )}

      {post.status === "OPEN" && (
        <div className="mt-8 border-t border-sep pt-5">
          <Button variant="ghost" size="sm" onClick={withdraw} disabled={busy}>
            Withdraw this request
          </Button>
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, people, price, perPerson }: { bid: OwnerBid; people: number; price: string; perPerson: string }) {
  const p = bid.provider;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-t font-semibold text-accent-ink">
          {initials(p.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/guides/${p.slug}`} className="font-semibold hover:text-accent-ink">
            {p.displayName}
          </Link>
          <p className="text-[13px] text-label2">
            {TYPE_LABEL[p.type]} · {p.city}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VerifiedBadge />
            {p.reviewCount > 0 ? <Rating value={p.rating} count={p.reviewCount} /> : <Pill tone="signal">New provider</Pill>}
            {responseLabel(p.responseTimeMin) && (
              <span className="inline-flex items-center gap-1 text-[12px] text-label2">
                <Clock aria-hidden className="size-3.5" /> {responseLabel(p.responseTimeMin)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-[34px] font-semibold leading-none tabular-nums">{price}</p>
          <p className="mt-1 text-[12px] text-label2">
            for {people} · {perPerson} each
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <InclusionChips ids={bid.inclusions} />
        <p className="text-[14px] leading-relaxed">{bid.pitch}</p>
        {p.languages.length > 0 && (
          <p className="flex items-center gap-1.5 text-[12px] text-label2">
            <Languages aria-hidden className="size-3.5" /> {p.languages.join(", ")}
            {p.yearsActive > 0 && ` · ${p.yearsActive} years guiding`}
          </p>
        )}
      </div>
    </Card>
  );
}
