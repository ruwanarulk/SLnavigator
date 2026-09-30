"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dayLabels, formatDuration, TRANSPORT_MODES, type TransportMode } from "@sln/core";
import clsx from "clsx";
import { GripVertical, Minus, Plus, X } from "lucide-react";
import { useId } from "react";
import type { TripStop } from "@/lib/types";
import { ModeIcon } from "./mode-icon";
import type { PlannerActions } from "./use-planner";

const MODE_LABEL = Object.fromEntries(TRANSPORT_MODES.map((m) => [m.id, m.label])) as Record<TransportMode, string>;

/**
 * "The Line": the trip drawn as a railway line, stations for stops and track
 * segments for legs. Drag a station (or use the keyboard) to reorder.
 */
export function TheLine({
  stops,
  actions,
  selectedId,
  onSelect,
  readOnly,
}: {
  stops: TripStop[];
  actions?: PlannerActions;
  selectedId?: string | null;
  onSelect?: (index: number) => void;
  readOnly?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // dnd-kit numbers its a11y ids with a global counter; a React id keeps SSR and hydration in sync.
  const dndId = useId();
  const labels = dayLabels(stops.map((s) => s.nights));
  const ids = stops.map((s, i) => `${s.location.id}-${i}`);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    actions?.moveStop(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  }

  if (!stops.length) {
    return (
      <p className="rounded-tile border border-dashed border-sep p-5 text-center text-[14px] text-label2">
        No stops yet. Search the map or pick a suggestion to start your line.
      </p>
    );
  }

  const list = (
    <ol className="relative" aria-label="Route stops">
      {stops.map((s, i) => (
        <Station
          key={ids[i]}
          id={ids[i]}
          stop={s}
          index={i}
          dayLabel={`${labels[i]}${i === 0 ? " · Arrive" : i === stops.length - 1 && s.nights === 0 ? " · Depart" : ""}`}
          isFirst={i === 0}
          isLast={i === stops.length - 1}
          selected={s.location.id === selectedId}
          onSelect={() => onSelect?.(i)}
          actions={actions}
          readOnly={readOnly}
        />
      ))}
    </ol>
  );

  if (readOnly) return list;
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}

function Station({
  id,
  stop,
  index,
  dayLabel,
  isFirst,
  isLast,
  selected,
  onSelect,
  actions,
  readOnly,
}: {
  id: string;
  stop: TripStop;
  index: number;
  dayLabel: string;
  isFirst: boolean;
  isLast: boolean;
  selected: boolean;
  onSelect: () => void;
  actions?: PlannerActions;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: readOnly });
  const loc = stop.location;
  const local = [loc.nameSi, loc.nameTa].filter(Boolean).join(" · ");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("relative pl-9", isDragging && "z-10 opacity-90")}
    >
      {/* Track */}
      {!isLast && <span aria-hidden className="absolute bottom-0 left-[11px] top-5 w-[4px] bg-accent" />}
      {!isFirst && <span aria-hidden className="absolute left-[11px] top-0 h-3 w-[4px] bg-accent" />}
      {/* Station */}
      <span
        aria-hidden
        className={clsx(
          "absolute left-[3px] top-2 size-5 border-[3.5px] border-accent",
          isFirst || isLast ? "rounded-[4px]" : "rounded-full",
          selected ? "bg-signal" : "bg-card",
        )}
      />

      <div className={clsx("group flex items-start gap-2 rounded-tile py-1.5 pr-1", selected && "bg-signal-t/60")}>
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-[20px] font-bold leading-tight tracking-[0.02em]">{loc.name.toUpperCase()}</span>
            <span className="text-[12px] text-label2">{dayLabel}</span>
          </span>
          {local && <span className="block font-local text-[12px] text-label2">{local}</span>}
        </button>
        {!readOnly && actions && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <div className="flex items-center rounded-full bg-fill" role="group" aria-label={`Nights in ${loc.name}`}>
              <button aria-label="One night fewer" onClick={() => actions.setNights(index, stop.nights - 1)} className="grid size-7 place-items-center rounded-full hover:bg-sep">
                <Minus className="size-3.5" />
              </button>
              <span className="w-12 text-center text-[12px] font-medium tabular-nums">
                {stop.nights} {stop.nights === 1 ? "night" : "nts"}
              </span>
              <button aria-label="One night more" onClick={() => actions.setNights(index, stop.nights + 1)} className="grid size-7 place-items-center rounded-full hover:bg-sep">
                <Plus className="size-3.5" />
              </button>
            </div>
            <button aria-label={`Remove ${loc.name}`} onClick={() => actions.removeStop(index)} className="grid size-7 place-items-center rounded-full text-label2 hover:bg-danger-t hover:text-danger">
              <X className="size-4" />
            </button>
            <button
              aria-label={`Reorder ${loc.name}`}
              className="grid size-7 cursor-grab touch-none place-items-center rounded-full text-label2 hover:bg-fill active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        )}
      </div>

      {!isLast && (
        <div className="flex items-center gap-2 pb-3 pt-0.5 text-[13px] text-label2">
          <ModeIcon mode={stop.modeToNext} />
          {readOnly || !actions ? (
            <span className="font-medium text-label">{MODE_LABEL[stop.modeToNext]}</span>
          ) : (
            <label className="relative">
              <span className="sr-only">How you travel from {loc.name}</span>
              <select
                value={stop.modeToNext}
                onChange={(e) => actions.setMode(index, e.target.value as TransportMode)}
                className="cursor-pointer appearance-none rounded-full bg-transparent py-0.5 pr-1 font-medium text-label underline decoration-sep underline-offset-4 hover:decoration-accent"
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {stop.leg && (
            <span>
              · {stop.leg.source === "estimate" ? "~" : ""}
              {formatDuration(stop.leg.durationMin)} · {stop.leg.distanceKm} km
            </span>
          )}
        </div>
      )}
    </li>
  );
}
