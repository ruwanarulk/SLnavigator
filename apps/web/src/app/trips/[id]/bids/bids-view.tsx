"use client";

import clsx from "clsx";
import { ArrowLeft, Check, Clock, Languages, Minus, Star, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/layout/session";
import { fmtRange, initials, InclusionChips, needLabel, ProgressSteps, responseLabel, timeLeft, useNow } from "@/components/marketplace/shared";
import { BID_INCLUSIONS } from "@sln/core";
import { Dialog } from "@/components/ui/dialog";
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
  const [tab, setTab] = useState<"offers" | "compare">("offers");
  const [accepting, setAccepting] = useState<OwnerBid | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
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
  const shortlisted = useMemo(() => post.bids.filter((b) => b.shortlisted), [post.bids]);

  async function toggleShortlist(bid: OwnerBid) {
    const next = !bid.shortlisted;
    setPost((p) => ({ ...p, bids: p.bids.map((b) => (b.id === bid.id ? { ...b, shortlisted: next } : b)) }));
    try {
      await api(`/trips/${trip.id}/bids/${bid.id}/shortlist`, { method: "PUT", json: { shortlisted: next } });
    } catch {
      setPost((p) => ({ ...p, bids: p.bids.map((b) => (b.id === bid.id ? { ...b, shortlisted: !next } : b)) }));
    }
  }

  async function accept() {
    if (!accepting) return;
    setBusy(true);
    setAcceptError(null);
    try {
      const { id } = await api<{ id: string }>(`/trips/${trip.id}/bids/${accepting.id}/accept`, { method: "POST" });
      router.push(`/bookings/${id}`);
      router.refresh();
    } catch (e) {
      setAcceptError((e as Error).message);
      setBusy(false);
    }
  }

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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="View" className="flex gap-1.5">
          {([
            ["offers", `Offers · ${post.bids.length}`],
            ["compare", `Compare · ${shortlisted.length}`],
          ] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={clsx("h-9 rounded-full px-4 text-[14px] font-semibold", tab === id ? "bg-label text-bg" : "bg-fill text-label hover:bg-sep")}>
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Sort offers" className={clsx("flex gap-1.5", tab === "compare" && "hidden")}>
          {SORTS.map((s) => (
            <button key={s.id} aria-pressed={sort === s.id} onClick={() => setSort(s.id)} className={clsx("h-8 rounded-full px-3.5 text-[13px] font-medium", sort === s.id ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-sep")}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "compare" ? (
        <CompareTable bids={shortlisted} people={people} money={money} onAccept={setAccepting} onRemove={toggleShortlist} canAccept={post.status === "OPEN"} />
      ) : bids.length === 0 ? (
        <Card className="mt-3 p-10 text-center">
          <p className="font-medium">No offers yet</p>
          <p className="mt-1 text-[14px] text-label2">Verified guides who cover your route have been notified. Offers usually start arriving within a few hours, and appear here automatically.</p>
        </Card>
      ) : (
        <ul className="mt-3 space-y-3">
          {bids.map((b) => (
            <li key={b.id}>
              <BidCard bid={b} people={people} price={money(b.priceUsd)} perPerson={money(Math.round(b.priceUsd / people))} canAccept={post.status === "OPEN"} onShortlist={() => toggleShortlist(b)} onAccept={() => setAccepting(b)} />
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

      <Dialog open={!!accepting} onClose={() => (busy ? undefined : setAccepting(null))} title="Accept this offer?">
        {accepting && (
          <div className="space-y-4 text-[14px]">
            <div className="rounded-tile bg-fill p-4">
              <p className="font-semibold">{accepting.provider.displayName}</p>
              <p className="font-display text-[30px] font-semibold leading-tight tabular-nums">{money(accepting.priceUsd)}</p>
              <p className="text-[12px] text-label2">
                for {people} · {trip.stops.map((s) => s.location.name).join(" → ")}
              </p>
              <InclusionChips ids={accepting.inclusions} className="mt-2" />
            </div>
            <ul className="list-inside list-disc space-y-1 text-label2">
              <li>The other guides are told you chose someone else.</li>
              <li>Your plan is locked, and you get {accepting.provider.displayName.split(" ")[0]}&apos;s phone number and can message them.</li>
              <li>Payment is arranged directly with your guide for now. Secure online payment, held until your trip ends, is coming soon.</li>
              <li>You can cancel before the trip starts.</li>
            </ul>
            {acceptError && (
              <p role="alert" className="rounded-tile bg-danger-t p-3 text-danger">
                {acceptError}
              </p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={accept} disabled={busy}>
                {busy ? "Booking…" : "Accept & Book"}
              </Button>
              <Button variant="secondary" onClick={() => setAccepting(null)} disabled={busy}>
                Not yet
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function CompareTable({
  bids,
  people,
  money,
  onAccept,
  onRemove,
  canAccept,
}: {
  bids: OwnerBid[];
  people: number;
  money: (usd: number) => string;
  onAccept: (b: OwnerBid) => void;
  onRemove: (b: OwnerBid) => void;
  canAccept: boolean;
}) {
  if (bids.length === 0) {
    return (
      <Card className="mt-3 p-10 text-center">
        <p className="font-medium">Nothing to compare yet</p>
        <p className="mt-1 text-[14px] text-label2">Tap the star on two or more offers to see them side by side.</p>
      </Card>
    );
  }
  const best = Math.min(...bids.map((b) => b.priceUsd));
  const row = "px-4 py-3 align-top text-[14px]";
  const rows: { label: string; cell: (b: OwnerBid) => React.ReactNode }[] = [
    { label: "Price", cell: (b) => <span className={clsx("font-display text-[26px] font-semibold tabular-nums", b.priceUsd === best && bids.length > 1 && "text-ok")}>{money(b.priceUsd)}</span> },
    { label: "Per person", cell: (b) => <span className="tabular-nums">{money(Math.round(b.priceUsd / people))}</span> },
    { label: "Rating", cell: (b) => (b.provider.reviewCount > 0 ? <Rating value={b.provider.rating} count={b.provider.reviewCount} /> : <Pill tone="signal">New provider</Pill>) },
    { label: "Reply time", cell: (b) => responseLabel(b.provider.responseTimeMin)?.replace("Replies in ", "") ?? <span className="text-label2">Not yet known</span> },
    ...BID_INCLUSIONS.map((i) => ({
      label: i.label,
      cell: (b: OwnerBid) => (b.inclusions.includes(i.id) ? <Check aria-label="Included" className="size-4 text-ok" /> : <Minus aria-label="Not included" className="size-4 text-label2" />),
    })),
    { label: "Languages", cell: (b) => b.provider.languages.join(", ") },
    { label: "Experience", cell: (b) => (b.provider.yearsActive ? `${b.provider.yearsActive} years` : <span className="text-label2">New</span>) },
    { label: "Pitch", cell: (b) => <span className="line-clamp-5 text-[13px]">{b.pitch}</span> },
  ];
  return (
    <Card className="mt-3 overflow-x-auto p-0">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-sep">
            <th className="w-32 px-4 py-3" />
            {bids.map((b) => (
              <th key={b.id} className="px-4 py-3 align-top font-normal">
                <p className="font-semibold">{b.provider.displayName}</p>
                <p className="text-[12px] text-label2">{TYPE_LABEL[b.provider.type]}</p>
                <button onClick={() => onRemove(b)} className="mt-1 text-[12px] text-label2 underline underline-offset-2 hover:text-label">
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-sep last:border-0">
              <th scope="row" className={clsx(row, "text-[13px] font-medium text-label2")}>
                {r.label}
              </th>
              {bids.map((b) => (
                <td key={b.id} className={row}>
                  {r.cell(b)}
                </td>
              ))}
            </tr>
          ))}
          {canAccept && (
            <tr>
              <td />
              {bids.map((b) => (
                <td key={b.id} className="px-4 py-4">
                  <Button size="sm" onClick={() => onAccept(b)}>
                    Accept
                  </Button>
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function BidCard({
  bid,
  people,
  price,
  perPerson,
  canAccept,
  onShortlist,
  onAccept,
}: {
  bid: OwnerBid;
  people: number;
  price: string;
  perPerson: string;
  canAccept: boolean;
  onShortlist: () => void;
  onAccept: () => void;
}) {
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
      {canAccept && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sep pt-4">
          <button
            onClick={onShortlist}
            aria-pressed={bid.shortlisted}
            className={clsx("inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition", bid.shortlisted ? "bg-signal-t text-signal-ink" : "bg-fill hover:bg-sep")}
          >
            <Star aria-hidden className={clsx("size-4", bid.shortlisted && "fill-signal text-signal")} /> {bid.shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
          <Button onClick={onAccept} className="ml-auto">
            Accept Offer
          </Button>
        </div>
      )}
    </Card>
  );
}
