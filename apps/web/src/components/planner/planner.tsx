"use client";

import { CATEGORIES, formatDuration, seasonFor, type Region } from "@sln/core";
import clsx from "clsx";
import { Check, CloudRain, CloudOff, Loader2, Plus, Sparkles, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { clearDraft, draftToCreateBody, loadInterests } from "@/lib/draft";
import type { LocationCard, Suggestion, Trip } from "@/lib/types";
import { useSession } from "../layout/session";
import { TripMap } from "../map/trip-map";
import { Dialog } from "../ui/dialog";
import { Button, ButtonLink, Chip, Rating } from "../ui/primitives";
import { SceneArt } from "../ui/scene-art";
import { BudgetPanel } from "./budget-panel";
import { PlaceSearch } from "./place-search";
import { TheLine } from "./the-line";
import { TransportOptions } from "./transport-options";
import { usePlanner, type SaveState } from "./use-planner";

const FILTERS = CATEGORIES.filter((c) => ["temple", "beach", "wildlife", "heritage", "hike"].includes(c.id));

export function Planner({ trip, places }: { trip: Trip | null; places: LocationCard[] }) {
  const router = useRouter();
  const { user } = useSession();
  const { state, actions, budget, days, travelMin, saveState } = usePlanner(trip);
  const [selected, setSelected] = useState<LocationCard | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [monsoon, setMonsoon] = useState(false);
  const [fetched, setFetched] = useState<{ key: string; list: Suggestion[] }>({ key: "", list: [] });
  const [dialog, setDialog] = useState<"bids" | "self" | null>(null);
  const [mobileTab, setMobileTab] = useState<"route" | "budget">("route");
  const [saving, setSaving] = useState(false);
  const openFork = (path: "self" | "bids") => {
    setDialog(path);
    track("fork_opened", { path: path === "self" ? "book_myself" : "guide_bids" });
  };

  const month = state.startDate ? new Date(state.startDate).getMonth() : new Date().getMonth();
  const monsoonRegions = useMemo(
    () => new Set(monsoon ? ["west", "south", "hill", "cultural", "east", "north"].filter((r) => seasonFor(r as Region, month) === "monsoon") : []),
    [monsoon, month],
  );
  const markerPlaces = filter ? places.filter((p) => p.category === filter) : places;
  const stopIds = state.stops.map((s) => s.location.id).join(",");

  // "You're near Ella, add Little Adam's Peak."
  useEffect(() => {
    if (!stopIds) return;
    const t = setTimeout(() => {
      api<Suggestion[]>("/planner/suggestions", {
        method: "POST",
        json: { locationIds: stopIds.split(","), interests: user?.interests.length ? user.interests : loadInterests() },
      })
        .then((list) => setFetched({ key: stopIds, list }))
        .catch(() => setFetched({ key: stopIds, list: [] }));
    }, 400);
    return () => clearTimeout(t);
  }, [stopIds, user]);
  // Drop suggestions already added, and hide stale results while the route has no stops.
  const suggestions = stopIds ? fetched.list.filter((s) => !state.stops.some((st) => st.location.id === s.location.id)) : [];

  const topSuggestion = suggestions[0];
  const inRoute = selected ? state.stops.findIndex((s) => s.location.id === selected.id) : -1;

  function addNear(s: Suggestion) {
    const idx = state.stops.findIndex((st) => st.location.name === s.nearStopName);
    actions.addStop(s.location, idx >= 0 ? idx : undefined);
    track("stop_added", { source: "suggestion" });
  }

  async function saveToAccount() {
    if (!user) {
      router.push(`/signup?next=/plan`);
      return;
    }
    setSaving(true);
    try {
      const created = await api<Trip>("/trips", {
        method: "POST",
        json: draftToCreateBody({ ...state, itinerarySlug: undefined }),
      });
      clearDraft();
      track("trip_created", { source: "draft_import", stops: created.stops.length });
      router.push(`/plan/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Trip name</span>
          <input
            value={state.title}
            onChange={(e) => actions.setMeta({ title: e.target.value })}
            maxLength={80}
            className="w-full truncate rounded-md bg-transparent font-display text-[30px] font-semibold leading-tight outline-none hover:bg-fill/60 focus:bg-fill/60"
          />
        </label>
        <SaveIndicator state={saveState} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-label2">
        <label className="flex items-center gap-1">
          <span className="sr-only">Start date</span>
          <input
            type="date"
            value={state.startDate ?? ""}
            onChange={(e) => actions.setMeta({ startDate: e.target.value || null })}
            className="rounded bg-transparent text-[13px] text-label2 outline-none hover:bg-fill/60"
          />
        </label>
        <span className="inline-flex items-center gap-1">
          <UsersRound aria-hidden className="size-3.5" /> {state.travelers} {state.travelers === 1 ? "traveller" : "travellers"}
        </span>
        {days > 0 && (
          <span>
            {days} days · {state.stops.length} stops · ~{formatDuration(travelMin)} on the road
          </span>
        )}
      </div>
    </div>
  );

  const route = (
    <div className="space-y-4">
      <TheLine
        stops={state.stops}
        actions={actions}
        selectedId={selected?.id}
        onSelect={(i) => setSelected(state.stops[i].location)}
      />
      {topSuggestion && (
        <div className="flex items-center justify-between gap-3 rounded-tile bg-signal-t px-4 py-3">
          <div className="text-[13px]">
            <p className="font-semibold text-signal-ink">Near {topSuggestion.nearStopName}</p>
            <p className="text-label">
              {topSuggestion.location.name} · +{formatDuration(topSuggestion.extraMin)}
            </p>
          </div>
          <button onClick={() => addNear(topSuggestion)} className="inline-flex h-9 items-center gap-1 rounded-full bg-signal px-4 text-[13px] font-semibold text-black">
            <Plus className="size-4" /> Add
          </button>
        </div>
      )}
      {suggestions.length > 1 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium text-accent-ink">
            <Sparkles aria-hidden className="mr-1 inline size-3.5" />
            {suggestions.length - 1} more nearby ideas
          </summary>
          <ul className="mt-2 space-y-1">
            {suggestions.slice(1).map((s) => (
              <li key={s.location.id} className="flex items-center justify-between gap-2 rounded-tile px-2 py-1.5 hover:bg-fill">
                <span>
                  <span className="font-medium">{s.location.name}</span> <span className="text-label2">near {s.nearStopName}</span>
                </span>
                <button onClick={() => addNear(s)} aria-label={`Add ${s.location.name}`} className="grid size-7 place-items-center rounded-full bg-fill hover:bg-sep">
                  <Plus className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <PlaceSearch
        places={places}
        onPick={(p) => {
          actions.addStop(p);
          track("stop_added", { source: "search" });
        }}
        placeholder="Add a stop"
      />
    </div>
  );

  const budgetPanel = (
    <BudgetPanel
      budget={budget}
      settings={state.budgetSettings}
      travelers={state.travelers}
      days={days}
      onSettings={(b) => actions.setMeta({ budgetSettings: b })}
      onTravelers={(n) => actions.setMeta({ travelers: n })}
    />
  );

  return (
    <div className="md:grid md:h-[calc(100dvh-64px)] md:grid-cols-[360px_1fr] md:grid-rows-1 xl:grid-cols-[380px_1fr_320px]">
      {/* Left rail */}
      <aside className="hidden overflow-y-auto border-r border-sep bg-card p-5 md:block" aria-label="Route">
        {header}
        {!trip && <LocalBanner onSave={saveToAccount} saving={saving} signedIn={!!user} />}
        <div className="mt-5">{route}</div>
        <div className="mt-8 xl:hidden">{budgetPanel}</div>
      </aside>

      {/* Map */}
      <section className="relative h-[52dvh] md:h-auto" aria-label="Map">
        <TripMap
          className="size-full"
          places={markerPlaces}
          route={state.stops}
          selectedId={selected?.id}
          onSelect={setSelected}
          fadedRegions={monsoonRegions}
          suggestion={topSuggestion?.location}
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2 md:inset-x-5 md:top-5">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <PlaceSearch places={places} onPick={(p) => setSelected(p)} placeholder="Search places to add" className="w-full max-w-xs flex-1" />
            <div className="ml-auto hidden gap-2 lg:flex">
              <Button variant="inverse" onClick={() => openFork("self")} disabled={state.stops.length < 2} className="shadow-float">
                Book It Myself
              </Button>
              <Button onClick={() => openFork("bids")} disabled={state.stops.length < 1} className="shadow-float">
                Get Guide Bids
              </Button>
            </div>
          </div>
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(filter === f.id ? null : f.id)} className="glass shrink-0 shadow-sm">
                {f.label}
              </Chip>
            ))}
            <Chip active={monsoon} onClick={() => setMonsoon((m) => !m)} className="glass shrink-0 shadow-sm">
              <CloudRain aria-hidden className="size-3.5" /> Monsoon
            </Chip>
          </div>
        </div>

        {selected && (
          <PreviewCard
            place={selected}
            inRoute={inRoute >= 0}
            monsoon={seasonFor(selected.region as Region, month) === "monsoon"}
            onAdd={() => {
              actions.addStop(selected);
              track("stop_added", { source: "map_preview" });
            }}
            onClose={() => setSelected(null)}
          />
        )}
      </section>

      {/* Right budget column (xl) */}
      <aside className="hidden overflow-y-auto border-l border-sep bg-card p-5 xl:block" aria-label="Budget">
        {budgetPanel}
      </aside>

      {/* Mobile sheet */}
      <div className="relative -mt-6 rounded-t-[28px] bg-card px-4 pb-28 pt-3 shadow-float md:hidden">
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sep" />
        {header}
        {!trip && <LocalBanner onSave={saveToAccount} saving={saving} signedIn={!!user} />}
        <div className="my-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => openFork("self")} disabled={state.stops.length < 2}>
            Book It Myself
          </Button>
          <Button size="sm" onClick={() => openFork("bids")} disabled={!state.stops.length}>
            Get Guide Bids
          </Button>
        </div>
        <div role="tablist" className="mb-4 grid grid-cols-2 rounded-full bg-fill p-1">
          {(["route", "budget"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={clsx("h-9 rounded-full text-[14px] font-medium capitalize", mobileTab === t ? "bg-card shadow-sm" : "text-label2")}
            >
              {t}
            </button>
          ))}
        </div>
        {mobileTab === "route" ? route : budgetPanel}
      </div>

      <Dialog open={dialog === "self"} onClose={() => setDialog(null)} title="Book it myself" wide>
        <TransportOptions stops={state.stops} travelers={state.travelers} onMode={actions.setMode} />
      </Dialog>
      <Dialog open={dialog === "bids"} onClose={() => setDialog(null)} title="Get guide bids">
        <div className="space-y-4 text-[14px]">
          <p>
            Soon you&apos;ll post this plan and verified guides and companies who cover your route will send offers within 48–72 hours. You compare, chat, and pay only
            when you accept. Payment is held until your trip ends.
          </p>
          <p className="rounded-tile bg-fill p-3 text-label2">
            Bidding opens with our pilot in the hill country. Until then, browse the verified guides in the directory.
          </p>
          <ButtonLink href="/guides" className="w-full">
            Browse Guides
          </ButtonLink>
        </div>
      </Dialog>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "local" || state === "idle") return null;
  const map = {
    saving: [<Loader2 key="i" className="size-3.5 animate-spin" />, "Saving"],
    saved: [<Check key="i" className="size-3.5" />, "Saved"],
    error: [<CloudOff key="i" className="size-3.5" />, "Not saved"],
  } as const;
  const [icon, label] = map[state];
  return (
    <span role="status" className={clsx("mt-2 inline-flex shrink-0 items-center gap-1 text-[12px]", state === "error" ? "text-danger" : "text-label2")}>
      {icon}
      {label}
    </span>
  );
}

function LocalBanner({ onSave, saving, signedIn }: { onSave: () => void; saving: boolean; signedIn: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-tile bg-accent-t px-3 py-2.5 text-[13px] text-accent-ink">
      <span>{signedIn ? "This draft is only on this device." : "Saved on this device. Create a free account to keep it."}</span>
      <Button size="sm" onClick={onSave} disabled={saving}>
        {signedIn ? "Save to My Trips" : "Save Trip"}
      </Button>
    </div>
  );
}

function PreviewCard({
  place,
  inRoute,
  monsoon,
  onAdd,
  onClose,
}: {
  place: LocationCard;
  inRoute: boolean;
  monsoon: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-10 left-3 right-3 z-20 overflow-hidden rounded-card bg-card shadow-float sm:left-auto sm:right-20 sm:w-72 md:bottom-6">
      <SceneArt hue={place.hue} imageUrl={place.imageUrl} label={place.name} className="h-28" />
      <button onClick={onClose} aria-label="Close preview" className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/50 text-white">
        ×
      </button>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{place.name}</p>
            <p className="text-[12px] text-label2">
              <span className="capitalize">{place.category}</span> · ~{formatDuration(place.avgDurationMin)}
              {place.entryFeeUsd > 0 ? ` · ~$${place.entryFeeUsd} entry` : " · Free"}
            </p>
          </div>
          <Rating value={place.rating} />
        </div>
        {monsoon && (
          <p className="flex items-center gap-1 text-[12px] text-signal-ink">
            <CloudRain aria-hidden className="size-3.5" /> Monsoon season in this region for your dates
          </p>
        )}
        <div className="flex items-center gap-2">
          {!inRoute && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="size-4" /> Add to Trip
            </Button>
          )}
          <Link href={`/places/${place.slug}`} className="text-[13px] font-semibold text-accent-ink underline underline-offset-4">
            Open Place Page
          </Link>
        </div>
      </div>
    </div>
  );
}
