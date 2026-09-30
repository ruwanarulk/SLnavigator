"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { LocationCard } from "@/lib/types";

/** Combobox over the curated places. Client-side: the catalogue is small. */
export function PlaceSearch({
  places,
  onPick,
  placeholder = "Search places to add",
  className,
}: {
  places: LocationCard[];
  onPick: (p: LocationCard) => void;
  placeholder?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return places
      .filter((p) => p.name.toLowerCase().includes(needle) || p.category.includes(needle) || p.tags.some((t) => t.includes(needle)))
      .slice(0, 8);
  }, [q, places]);

  function pick(p: LocationCard) {
    onPick(p);
    setQ("");
    setOpen(false);
  }

  return (
    <div className={className}>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-label2" />
        <input
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && results[active]) pick(results[active]);
            if (e.key === "Escape") setOpen(false);
          }}
          className="glass h-11 w-full rounded-full pl-10 pr-4 text-[15px] shadow-float outline-none placeholder:text-label2"
        />
        {open && results.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-tile bg-card py-1 shadow-float">
            {results.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between px-4 py-2 text-[14px] ${i === active ? "bg-fill" : ""}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-[12px] capitalize text-label2">{p.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
