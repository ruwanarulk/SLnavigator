"use client";

import clsx from "clsx";
import { BadgeCheck, Banknote, CalendarDays, Mail, MapPin, Phone, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/layout/session";
import { fmtRange, initials, InclusionChips, ProgressSteps } from "@/components/marketplace/shared";
import { StartConversation } from "@/components/messaging/start-conversation";
import { Dialog } from "@/components/ui/dialog";
import { Button, ButtonLink, Card, DisplayHeading, Pill, Rating } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export interface BookingData {
  id: string;
  tripId: string;
  status: "CONFIRMED" | "CANCELLED";
  phase: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  viewer: "TRAVELLER" | "PROVIDER";
  createdAt: string;
  priceUsd: number;
  pricePerPersonUsd: number | null;
  youReceiveUsd?: number;
  commissionPct?: number;
  inclusions: string[];
  pitch: string;
  cancellable: boolean;
  cancelledBy: "TRAVELLER" | "PROVIDER" | null;
  cancelReason: string | null;
  trip: {
    id: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    adults: number;
    children: number;
    notes: string;
    stops: { name: string; nights: number; slug: string | null }[];
  };
  provider: { id: string; slug: string; displayName: string; type: string; city: string; languages: string[]; rating: number; reviewCount: number; phone: string | null };
  traveller: { name: string; email: string | null };
}

const PHASE = {
  UPCOMING: { label: "Upcoming", tone: "accent" as const },
  IN_PROGRESS: { label: "In progress", tone: "ok" as const },
  COMPLETED: { label: "Completed", tone: "neutral" as const },
  CANCELLED: { label: "Cancelled", tone: "danger" as const },
};

export function BookingView({ initial }: { initial: BookingData }) {
  const router = useRouter();
  const { money } = useSession();
  const [b, setB] = useState(initial);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTraveller = b.viewer === "TRAVELLER";
  const phase = PHASE[b.phase];
  const people = b.trip.adults + b.trip.children;
  const other = isTraveller ? b.provider.displayName : b.traveller.name;

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      setB(await api<BookingData>(`/bookings/${b.id}/cancel`, { method: "POST", json: { reason } }));
      setCancelling(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-28 pt-8 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone={phase.tone}>{phase.label}</Pill>
          <DisplayHeading as="h1" className="mt-2 text-[40px]">
            {b.trip.title}
          </DisplayHeading>
          {b.trip.startDate && b.trip.endDate && (
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-label2">
              <CalendarDays aria-hidden className="size-4" /> {fmtRange(b.trip.startDate, b.trip.endDate)} · <UsersRound aria-hidden className="size-4" /> {people} {people === 1 ? "traveller" : "travellers"}
            </p>
          )}
        </div>
        {isTraveller && b.status === "CONFIRMED" && <ProgressSteps current={3} />}
      </div>

      {b.status === "CANCELLED" ? (
        <div className="mt-5 rounded-card bg-danger-t p-5 text-danger">
          <p className="flex items-center gap-2 font-semibold">
            <XCircle aria-hidden className="size-5" /> Cancelled by {b.cancelledBy === b.viewer ? "you" : isTraveller ? "your guide" : "the traveller"}
          </p>
          {b.cancelReason && <p className="mt-1 text-[14px] text-label">&ldquo;{b.cancelReason}&rdquo;</p>}
          {isTraveller && (
            <ButtonLink href={`/plan/${b.tripId}`} size="sm" className="mt-3">
              Edit & Post Again
            </ButtonLink>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-card bg-ok-t p-5 text-ok">
          <p className="flex items-center gap-2 font-semibold">
            <BadgeCheck aria-hidden className="size-5" /> {b.phase === "COMPLETED" ? "This trip is complete" : "Booking confirmed"}
          </p>
          <p className="mt-1 text-[14px]">
            {isTraveller ? `${b.provider.displayName} will be your ${b.provider.type === "TRANSPORT" ? "driver" : "guide"}.` : `You're booked with ${b.traveller.name}. Confirm the details and say hello.`}
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold">Itinerary</h2>
            <ol className="space-y-2 text-[14px]">
              {b.trip.stops.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-center gap-3">
                  <MapPin aria-hidden className="size-4 shrink-0 text-accent-ink" />
                  <span className="font-medium">{s.slug ? <Link href={`/places/${s.slug}`} className="hover:text-accent-ink">{s.name}</Link> : s.name}</span>
                  <span className="text-[12px] text-label2">{s.nights > 0 ? `${s.nights} ${s.nights === 1 ? "night" : "nights"}` : i === b.trip.stops.length - 1 ? "Depart" : ""}</span>
                </li>
              ))}
            </ol>
            {b.trip.notes && (
              <p className="mt-4 rounded-tile bg-fill p-3 text-[13px]">
                <span className="font-medium">{isTraveller ? "Your notes: " : "Traveller's notes: "}</span>
                {b.trip.notes}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold">The offer</h2>
            <InclusionChips ids={b.inclusions} />
            <p className="mt-3 text-[14px] leading-relaxed">{b.pitch}</p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[12px] text-label2">{isTraveller ? "Price for the group" : "Agreed price"}</p>
            <p className="font-display text-[38px] font-semibold leading-tight tabular-nums">{money(b.priceUsd)}</p>
            {isTraveller && b.pricePerPersonUsd !== null && <p className="text-[13px] text-label2">{money(b.pricePerPersonUsd)} per person</p>}
            {!isTraveller && b.youReceiveUsd !== undefined && (
              <p className="text-[13px] text-label2">
                You receive <span className="font-semibold text-label">{money(b.youReceiveUsd)}</span> after {b.commissionPct}% commission.
              </p>
            )}
            {b.status === "CONFIRMED" && (
              <p className="mt-4 flex gap-2 rounded-tile bg-signal-t p-3 text-[12px] text-signal-ink">
                <Banknote aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  Payment is arranged directly between you and {isTraveller ? "your guide" : "the traveller"} for now. Secure online payment, held until the trip ends, is coming soon.
                </span>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-11 place-items-center rounded-full bg-accent-t font-semibold text-accent-ink">
                {initials(other)}
              </span>
              <div className="min-w-0">
                {isTraveller ? (
                  <Link href={`/guides/${b.provider.slug}`} className="font-semibold hover:text-accent-ink">
                    {b.provider.displayName}
                  </Link>
                ) : (
                  <p className="font-semibold">{b.traveller.name}</p>
                )}
                {isTraveller && <p className="text-[12px] text-label2">{b.provider.city} · {b.provider.languages.join(", ")}</p>}
              </div>
            </div>
            {isTraveller && b.provider.reviewCount > 0 && (
              <div className="mt-2">
                <Rating value={b.provider.rating} count={b.provider.reviewCount} />
              </div>
            )}
            {b.status === "CONFIRMED" && (
              <ul className="mt-4 space-y-2 text-[14px]">
                {isTraveller && b.provider.phone && (
                  <li className="flex items-center gap-2">
                    <Phone aria-hidden className="size-4 text-label2" />
                    <a href={`tel:${b.provider.phone}`} className="font-medium hover:text-accent-ink">
                      {b.provider.phone}
                    </a>
                  </li>
                )}
                {!isTraveller && b.traveller.email && (
                  <li className="flex items-center gap-2">
                    <Mail aria-hidden className="size-4 text-label2" />
                    <a href={`mailto:${b.traveller.email}`} className="font-medium hover:text-accent-ink">
                      {b.traveller.email}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </Card>

          <StartConversation tripId={b.tripId} providerId={isTraveller ? b.provider.id : undefined} label={`Message ${other.split(" ")[0]}`} variant="primary" />
          {b.cancellable && (
            <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
              Cancel this booking
            </Button>
          )}
        </div>
      </div>

      <Dialog open={cancelling} onClose={() => (busy ? undefined : setCancelling(false))} title="Cancel this booking?">
        <div className="space-y-4 text-[14px]">
          <p className="text-label2">
            {isTraveller ? "Your plan unlocks and you can post it again for new offers." : "The traveller is told straight away and can post their trip again."} Cancellation terms are still being finalised, so please be considerate.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">Reason ({other} will see this)</span>
            <textarea className={clsx("w-full rounded-tile border border-sep bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-accent")} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && (
            <p role="alert" className="rounded-tile bg-danger-t p-3 text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="danger" className="flex-1" onClick={cancel} disabled={busy || reason.trim().length < 5}>
              {busy ? "Cancelling…" : "Cancel Booking"}
            </Button>
            <Button variant="secondary" onClick={() => setCancelling(false)} disabled={busy}>
              Keep it
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
