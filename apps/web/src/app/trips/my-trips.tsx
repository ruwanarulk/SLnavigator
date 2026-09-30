"use client";

import { formatDuration } from "@sln/core";
import clsx from "clsx";
import { Archive, ArchiveRestore, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MiniLine } from "@/components/itinerary-card";
import { useSession } from "@/components/layout/session";
import { TripMap } from "@/components/map/trip-map";
import { ButtonLink, Card, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Trip } from "@/lib/types";

export function MyTrips({ drafts, archived }: { drafts: Trip[]; archived: Trip[] }) {
  const [tab, setTab] = useState<"planning" | "archived">("planning");
  const [lists, setLists] = useState({ planning: drafts, archived });
  const router = useRouter();

  async function act(trip: Trip, action: "duplicate" | "archive" | "restore" | "delete" | "rename", title?: string) {
    if (action === "duplicate") {
      const copy = await api<Trip>(`/trips/${trip.id}/duplicate`, { method: "POST" });
      setLists((l) => ({ ...l, planning: [copy, ...l.planning] }));
    } else if (action === "archive" || action === "restore") {
      const updated = await api<Trip>(`/trips/${trip.id}`, { method: "PATCH", json: { status: action === "archive" ? "ARCHIVED" : "DRAFT" } });
      setLists((l) =>
        action === "archive"
          ? { planning: l.planning.filter((t) => t.id !== trip.id), archived: [updated, ...l.archived] }
          : { archived: l.archived.filter((t) => t.id !== trip.id), planning: [updated, ...l.planning] },
      );
    } else if (action === "delete") {
      if (!confirm(`Delete "${trip.title}" permanently? This can't be undone.`)) return;
      await api(`/trips/${trip.id}`, { method: "DELETE" });
      setLists((l) => ({ ...l, archived: l.archived.filter((t) => t.id !== trip.id) }));
    } else if (action === "rename" && title) {
      const updated = await api<Trip>(`/trips/${trip.id}`, { method: "PATCH", json: { title } });
      setLists((l) => ({ ...l, planning: l.planning.map((t) => (t.id === trip.id ? updated : t)) }));
    }
    router.refresh();
  }

  const shown = lists[tab];

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-28 pt-8 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <DisplayHeading as="h1" className="text-[44px] md:text-[56px]">
          Trips
        </DisplayHeading>
        <ButtonLink href="/start" size="sm">
          <Plus className="size-4" /> New Trip
        </ButtonLink>
      </div>
      <div role="tablist" className="mt-5 inline-grid grid-cols-2 rounded-full bg-fill p-1">
        {(["planning", "archived"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={clsx("h-9 rounded-full px-5 text-[14px] font-medium capitalize", tab === t ? "bg-card shadow-sm" : "text-label2")}
          >
            {t} ({lists[t].length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="mt-6 p-10 text-center">
          <p className="text-[15px] text-label2">{tab === "planning" ? "No trips yet. Start with a few interests and we'll sketch a route." : "Nothing archived."}</p>
          {tab === "planning" && (
            <ButtonLink href="/start" className="mt-4">
              Start Planning
            </ButtonLink>
          )}
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {shown.map((t) => (
            <TripCard key={t.id} trip={t} archived={tab === "archived"} onAction={(a, title) => act(t, a, title)} />
          ))}
        </ul>
      )}
      <p className="mt-8 text-[13px] text-label2">Trips you open are kept on this device for offline use in the hills.</p>
    </div>
  );
}

function TripCard({
  trip,
  archived,
  onAction,
}: {
  trip: Trip;
  archived: boolean;
  onAction: (a: "duplicate" | "archive" | "restore" | "delete" | "rename", title?: string) => Promise<void>;
}) {
  const { money } = useSession();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [busy, setBusy] = useState(false);
  const first = trip.stops[0]?.location.name;
  const last = trip.stops[trip.stops.length - 1]?.location.name;

  const run = async (a: Parameters<typeof onAction>[0], t?: string) => {
    setBusy(true);
    try {
      await onAction(a, t);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={clsx("overflow-hidden rounded-card bg-card", busy && "opacity-60")}>
      {trip.stops.length > 1 && (
        <Link href={`/plan/${trip.id}`} tabIndex={-1} aria-hidden>
          <TripMap className="pointer-events-none h-40" places={[]} route={trip.stops} routeOnly compact />
        </Link>
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(false);
                if (title.trim() && title !== trip.title) run("rename", title.trim());
              }}
              className="flex-1"
            >
              <input
                autoFocus
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                aria-label="Trip name"
                className="w-full rounded-md border border-accent bg-bg px-2 py-1 text-[17px] font-semibold outline-none"
              />
            </form>
          ) : (
            <Link href={`/plan/${trip.id}`} className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold hover:text-accent-ink">{trip.title}</h2>
            </Link>
          )}
          <span className="shrink-0 text-[14px] font-semibold tabular-nums">{money(trip.budget.total)}</span>
        </div>
        <p className="text-[13px] text-label2">
          {trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No dates yet"} ·{" "}
          {trip.travelers} {trip.travelers === 1 ? "traveller" : "travellers"}
          {trip.days > 0 && ` · ${trip.days} days · ~${formatDuration(trip.totalTravelMin)} travel`}
        </p>
        {first && last && <MiniLine from={first} to={last} count={trip.stops.length} />}
        <div className="flex flex-wrap gap-1 pt-1">
          {archived ? (
            <>
              <IconBtn icon={ArchiveRestore} label="Restore" onClick={() => run("restore")} />
              <IconBtn icon={Trash2} label="Delete" danger onClick={() => run("delete")} />
            </>
          ) : (
            <>
              <IconBtn icon={Pencil} label="Rename" onClick={() => setEditing(true)} />
              <IconBtn icon={Copy} label="Duplicate" onClick={() => run("duplicate")} />
              <IconBtn icon={Archive} label="Archive" onClick={() => run("archive")} />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function IconBtn({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium",
        danger ? "text-danger hover:bg-danger-t" : "text-label2 hover:bg-fill hover:text-label",
      )}
    >
      <Icon aria-hidden className="size-3.5" /> {label}
    </button>
  );
}
