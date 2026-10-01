"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  autocompletePlaces,
  getPlace,
  googlePlacesAvailable,
  newSessionToken,
  type PlaceSuggestion,
} from "@/lib/google-places";
import type { LocationCard } from "@/lib/types";

type Option =
  | { kind: "curated"; place: LocationCard }
  | { kind: "google"; suggestion: PlaceSuggestion };

const MIN_GOOGLE_CHARS = 3;
const DEBOUNCE_MS = 300;

/**
 * Search over the curated places (instant, local) plus anything in Sri Lanka
 * from Google Places. Curated results come first because they carry fees,
 * hours and suggestions; a Google pick is stored as a plain coordinate place.
 */
export function PlaceSearch({
  places,
  onPick,
  placeholder = "Search places to add",
  className,
}: {
  places: LocationCard[];
  onPick: (p: LocationCard, via: "curated" | "google") => void;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [google, setGoogle] = useState<{ query: string; items: PlaceSuggestion[] }>({ query: "", items: [] });
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<string | null>(null);
  const listId = useId();
  const needle = q.trim().toLowerCase();

  const curated = useMemo(() => {
    if (!needle) return [];
    return places
      .filter((p) => p.name.toLowerCase().includes(needle) || p.category.includes(needle) || p.tags.some((t) => t.includes(needle)))
      .slice(0, 5);
  }, [needle, places]);

  useEffect(() => {
    if (needle.length < MIN_GOOGLE_CHARS || !googlePlacesAvailable()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      session.current ??= newSessionToken();
      setSearching(true);
      try {
        const items = await autocompletePlaces(needle, session.current, controller.signal);
        setGoogle({ query: needle, items });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setGoogle({ query: needle, items: [] });
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [needle]);

  // Only show Google results that belong to the current text, and skip ones we already list as curated.
  const googleItems = useMemo(() => {
    if (google.query !== needle) return [];
    const curatedNames = new Set(places.map((p) => p.name.toLowerCase()));
    return google.items.filter((s) => !curatedNames.has(s.name.toLowerCase())).slice(0, 5);
  }, [google, needle, places]);

  const options: Option[] = [
    ...curated.map((place) => ({ kind: "curated" as const, place })),
    ...googleItems.map((suggestion) => ({ kind: "google" as const, suggestion })),
  ];

  function reset() {
    setQ("");
    setOpen(false);
    setGoogle({ query: "", items: [] });
    setError(null);
  }

  async function pick(o: Option) {
    if (o.kind === "curated") {
      onPick(o.place, "curated");
      reset();
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const token = session.current ?? newSessionToken();
      const picked = await getPlace(o.suggestion.placeId, token);
      const card = await api<LocationCard>("/places/custom", { method: "POST", json: picked });
      onPick(card, "google");
      reset();
    } catch {
      setError("Couldn't add that place. Please try again.");
    } finally {
      session.current = null; // Place Details ended this billing session
      setAdding(false);
    }
  }

  const showList = open && (options.length > 0 || searching || !!error);

  return (
    <div className={className}>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-label2" />
        <input
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
            setError(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, options.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && options[active]) void pick(options[active]);
            if (e.key === "Escape") setOpen(false);
          }}
          className="glass h-11 w-full rounded-full pl-10 pr-10 text-[15px] shadow-float outline-none placeholder:text-label2"
        />
        {(searching || adding) && <Loader2 aria-hidden className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-label2" />}
        {showList && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-tile bg-card py-1 shadow-float">
            {options.map((o, i) => {
              const sectionStart = o.kind === "google" && (i === 0 || options[i - 1].kind === "curated");
              return (
                <li key={o.kind === "curated" ? o.place.id : o.suggestion.placeId} role="presentation">
                  {sectionStart && (
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-label2">More places in Sri Lanka</p>
                  )}
                  <div
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void pick(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-[14px] ${i === active ? "bg-fill" : ""}`}
                  >
                    {o.kind === "curated" ? (
                      <>
                        <span className="font-medium">{o.place.name}</span>
                        <span className="shrink-0 text-[12px] capitalize text-label2">{o.place.category}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <MapPin aria-hidden className="size-3.5 shrink-0 text-label2" />
                          <span className="truncate">
                            <span className="font-medium">{o.suggestion.name}</span>
                            {o.suggestion.secondary && <span className="text-label2"> · {o.suggestion.secondary}</span>}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
            {error && (
              <li role="alert" className="px-4 py-2 text-[13px] text-danger">
                {error}
              </li>
            )}
            {googleItems.length > 0 && <li role="presentation" className="px-4 pb-1 pt-1 text-right text-[10px] text-label2">Powered by Google</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
