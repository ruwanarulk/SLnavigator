"use client";

import { BID_INCLUSIONS, SERVICE_NEEDS } from "@sln/core";
import clsx from "clsx";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export const inclusionLabel = (id: string) => BID_INCLUSIONS.find((i) => i.id === id)?.label ?? id;
export const needLabel = (id: string) => SERVICE_NEEDS.find((n) => n.id === id)?.label ?? id;

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });
export const fmtRange = (a: string, b: string) => `${fmtDate(a)}–${fmtDate(b, { day: "numeric", month: "short", year: "numeric" })}`;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Ticks while the tab is open so countdowns stay honest. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}

export function timeLeft(deadlineIso: string, now: number) {
  const ms = new Date(deadlineIso).getTime() - now;
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  return h >= 48 ? `${Math.floor(h / 24)} d ${h % 24} h` : h >= 1 ? `${h} h ${min % 60} m` : `${Math.max(1, min)} m`;
}

export function responseLabel(min: number | null) {
  if (!min) return null;
  return min < 60 ? `Replies in ~${min} min` : `Replies in ~${Math.round(min / 60)} h`;
}

export function InclusionChips({ ids, className }: { ids: string[]; className?: string }) {
  if (ids.length === 0) return <p className="text-[13px] text-label2">Nothing listed as included</p>;
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)}>
      {ids.map((id) => (
        <li key={id} className="inline-flex items-center gap-1 rounded-full bg-accent-t px-2.5 py-1 text-[12px] font-medium text-accent-ink">
          <Check aria-hidden className="size-3" />
          {inclusionLabel(id)}
        </li>
      ))}
    </ul>
  );
}

const STEPS = ["Plan", "Post", "Compare", "Book"] as const;

/** Plan → Post → Compare → Book, as in the mockup's bid screens. `current` is the active step index. */
export function ProgressSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-[12px] font-medium" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={clsx(
              "grid size-5 place-items-center rounded-full text-[11px]",
              i < current ? "bg-accent text-on-accent" : i === current ? "bg-accent-t text-accent-ink ring-2 ring-accent" : "bg-fill text-label2",
            )}
          >
            {i < current ? <Check aria-hidden className="size-3" /> : i + 1}
          </span>
          <span className={i <= current ? "text-label" : "text-label2"}>{s}</span>
          {i < STEPS.length - 1 && <span aria-hidden className={clsx("h-px w-5", i < current ? "bg-accent" : "bg-sep")} />}
        </li>
      ))}
    </ol>
  );
}
