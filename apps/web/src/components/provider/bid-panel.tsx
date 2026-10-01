"use client";

import { BID_INCLUSIONS } from "@sln/core";
import clsx from "clsx";
import { CalendarCheck, Clock, UsersRound } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { fmtRange, needLabel, timeLeft, useNow } from "../marketplace/shared";
import { Button, Card, Pill } from "../ui/primitives";

export interface RequestItem {
  id: string;
  tripId: string;
  title: string;
  travellerName: string;
  startDate: string;
  endDate: string;
  days: number;
  adults: number;
  children: number;
  budgetMinUsd: number;
  budgetMaxUsd: number;
  need: string;
  interests: string[];
  languages: string[];
  notes: string;
  deadline: string;
  stops: { name: string; nights: number; region: string }[];
  bidCount: number;
  matches: boolean;
  matchTags: string[];
  commissionPct: number;
  myBid: { id: string; status: string; priceUsd: number; youReceiveUsd: number; inclusions: string[]; pitch: string } | null;
}

export const groupLabel = (r: Pick<RequestItem, "adults" | "children">) =>
  `${r.adults} ${r.adults === 1 ? "adult" : "adults"}${r.children ? `, ${r.children} ${r.children === 1 ? "child" : "children"}` : ""}`;

/** Bid form for one request, as in the mockup: price, what's included, a short pitch, availability. */
export function BidPanel({ request, onChanged }: { request: RequestItem; onChanged: (r: RequestItem) => void }) {
  const mine = request.myBid && request.myBid.status === "PENDING" ? request.myBid : null;
  const [price, setPrice] = useState(mine ? String(mine.priceUsd) : "");
  const [inclusions, setInclusions] = useState<string[]>(mine?.inclusions ?? []);
  const [pitch, setPitch] = useState(mine?.pitch ?? "");
  const [available, setAvailable] = useState(!!mine);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const now = useNow();
  const left = timeLeft(request.deadline, now);

  const priceNum = Number(price);
  const receive = priceNum > 0 ? Math.round(priceNum * (1 - request.commissionPct / 100)) : 0;
  const input = "w-full rounded-tile border border-sep bg-bg px-3.5 text-[15px] outline-none focus:border-accent";

  async function submit() {
    setMsg(null);
    if (!(priceNum >= 10)) return setMsg({ tone: "error", text: "Enter your total price for the group in USD." });
    if (pitch.trim().length < 10) return setMsg({ tone: "error", text: "Add a short pitch: who you are and why you suit this trip." });
    if (!available) return setMsg({ tone: "error", text: "Confirm you're available on these dates." });
    setBusy(true);
    try {
      const bid = await api<NonNullable<RequestItem["myBid"]>>(`/provider/requests/${request.id}/bid`, {
        method: "PUT",
        json: { priceUsd: Math.round(priceNum), inclusions, pitch: pitch.trim(), availabilityConfirmed: true },
      });
      onChanged({ ...request, myBid: bid, bidCount: request.myBid?.status === "PENDING" ? request.bidCount : request.bidCount + 1 });
      setMsg({ tone: "ok", text: mine ? "Bid updated. The traveller has been told." : "Bid sent. The traveller has been notified." });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!confirm("Withdraw your bid on this trip?")) return;
    setBusy(true);
    try {
      await api(`/provider/requests/${request.id}/bid`, { method: "DELETE" });
      onChanged({ ...request, myBid: null, bidCount: Math.max(0, request.bidCount - 1) });
      setPrice("");
      setAvailable(false);
      setMsg({ tone: "ok", text: "Bid withdrawn." });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-5">
      <div>
        <p className="text-[12px] text-label2">Your bid</p>
        <h2 className="font-display text-[28px] font-semibold leading-tight">{request.title}</h2>
        <p className="text-[13px] text-label2">
          {request.travellerName} · {fmtRange(request.startDate, request.endDate)} · {request.days} days · {groupLabel(request)}
        </p>
      </div>

      <div className="space-y-2 text-[14px]">
        <p className="font-medium">{request.stops.map((s) => s.name).join(" → ")}</p>
        <p className="text-label2">
          {needLabel(request.need)} · budget ${request.budgetMinUsd.toLocaleString("en-US")}–${request.budgetMaxUsd.toLocaleString("en-US")}
        </p>
        {request.languages.length > 0 && <p className="text-label2">Would like: {request.languages.join(", ")}</p>}
        {request.notes && <p className="rounded-tile bg-fill p-3">{request.notes}</p>}
        <p className="flex items-center gap-1.5 text-[13px] text-signal-ink">
          <Clock aria-hidden className="size-4" /> {left ? `Bidding closes in ${left}` : "Bidding has closed"}
        </p>
      </div>

      {left ? (
        <>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-semibold">Total price for the group (USD)</span>
            <span className="flex h-12 items-center gap-2 rounded-tile border border-sep bg-bg px-3.5 focus-within:border-accent">
              <span className="text-label2">$</span>
              <input type="number" min={10} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="h-full w-full bg-transparent text-[16px] outline-none" aria-describedby="receive" />
            </span>
            <span id="receive" className="mt-1.5 block text-[12px] text-label2">
              {receive > 0 ? (
                <>
                  You receive <span className="font-semibold text-label">${receive.toLocaleString("en-US")}</span> after {request.commissionPct}% commission, paid out after the trip.
                </>
              ) : (
                <>Commission is {request.commissionPct}%, only on completed trips.</>
              )}
            </span>
          </label>

          <fieldset>
            <legend className="mb-2 text-[14px] font-semibold">Included</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {BID_INCLUSIONS.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-center gap-2.5 rounded-tile px-2 py-1.5 text-[14px] hover:bg-fill">
                  <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={inclusions.includes(i.id)} onChange={() => setInclusions((l) => (l.includes(i.id) ? l.filter((x) => x !== i.id) : [...l, i.id]))} />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-[14px] font-semibold">Short pitch</span>
            <textarea className={clsx(input, "min-h-28 py-3")} maxLength={800} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Who you are, what you'd add to this trip, and why you suit these travellers." />
            <span className="mt-1 block text-right text-[12px] text-label2">{pitch.trim().length} / 800</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-tile bg-accent-t px-3 py-2.5 text-[14px] text-accent-ink">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            <CalendarCheck aria-hidden className="size-4" />
            I&apos;m available {fmtRange(request.startDate, request.endDate)}
          </label>

          {msg && (
            <p role={msg.tone === "error" ? "alert" : "status"} className={clsx("rounded-tile p-3 text-[13px]", msg.tone === "error" ? "bg-danger-t text-danger" : "bg-ok-t text-ok")}>
              {msg.text}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={busy}>
              {mine ? "Update Bid" : "Submit Bid"}
            </Button>
            {mine && (
              <Button variant="ghost" onClick={withdraw} disabled={busy}>
                Withdraw Bid
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-tile bg-fill p-3 text-[14px] text-label2">
          {request.myBid ? `Your bid of $${request.myBid.priceUsd.toLocaleString("en-US")} is with the traveller.` : "Bidding on this request has closed."}
        </p>
      )}
    </Card>
  );
}

export function RequestCard({ r, selected, onClick, href }: { r: RequestItem; selected?: boolean; onClick?: () => void; href: string }) {
  const now = useNow();
  const left = timeLeft(r.deadline, now);
  return (
    <a
      href={href}
      onClick={(e) => {
        if (onClick && window.matchMedia("(min-width: 1024px)").matches) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-current={selected ? "true" : undefined}
      className={clsx("block rounded-card border-2 bg-card p-4 transition hover:shadow-float", selected ? "border-accent" : "border-transparent")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{r.title}</p>
          <p className="text-[12px] text-label2">
            {r.travellerName} · {fmtRange(r.startDate, r.endDate)} · {r.days} days · {groupLabel(r)}
          </p>
        </div>
        {left && (
          <Pill tone="signal" className="shrink-0">
            <Clock aria-hidden className="size-3" /> {left} left
          </Pill>
        )}
      </div>
      <p className="mt-2 text-[13px]">{r.stops.map((s) => s.name).join(", ")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Pill tone="accent">
          Budget ${r.budgetMinUsd.toLocaleString("en-US")}–${r.budgetMaxUsd.toLocaleString("en-US")}
        </Pill>
        {r.matchTags.map((t) => (
          <Pill key={t} tone="ok">
            ✓ {t}
          </Pill>
        ))}
        {r.myBid && r.myBid.status === "PENDING" && <Pill tone="neutral">You bid ${r.myBid.priceUsd.toLocaleString("en-US")}</Pill>}
        <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-label2">
          <UsersRound aria-hidden className="size-3.5" /> {r.bidCount} {r.bidCount === 1 ? "bid" : "bids"} so far
        </span>
      </div>
    </a>
  );
}
