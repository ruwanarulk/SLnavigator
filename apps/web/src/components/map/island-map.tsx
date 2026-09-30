"use client";

import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { TripMapProps } from "./types";

/**
 * Keyless fallback map: a stylised island in the mockups' look, used when no
 * Google Maps key is configured (local dev, previews, offline).
 */

// Simplified coastline, clockwise from Point Pedro.
const COAST: [number, number][] = [
  [9.83, 80.25], [9.68, 80.45], [9.45, 80.62], [9.1, 80.9], [8.85, 81.08], [8.57, 81.23], [8.35, 81.38],
  [8.05, 81.52], [7.72, 81.7], [7.4, 81.83], [7.05, 81.88], [6.84, 81.84], [6.55, 81.72], [6.35, 81.55],
  [6.18, 81.3], [6.05, 81.05], [5.95, 80.8], [5.92, 80.59], [5.97, 80.4], [6.03, 80.22], [6.2, 80.07],
  [6.45, 80.0], [6.7, 79.9], [6.93, 79.84], [7.2, 79.83], [7.5, 79.8], [7.85, 79.78], [8.1, 79.72],
  [8.3, 79.8], [8.55, 79.9], [8.8, 79.92], [9.05, 80.02], [9.3, 80.06], [9.5, 79.95], [9.65, 79.95],
  [9.78, 80.05],
];

// Extra room at the top keeps Jaffna clear of the floating search bar.
const LAT_TOP = 10.45;
const LNG_LEFT = 79.35;
const K = 150; // px per degree
const W = 2.85 * K;
const H = 4.75 * K;

const project = (lat: number, lng: number) => ({ x: (lng - LNG_LEFT) * K, y: (LAT_TOP - lat) * K });

export function IslandMap({ places, route, selectedId, onSelect, fadedRegions, routeOnly, suggestion, compact, className }: TripMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const coast = useMemo(() => COAST.map(([la, ln]) => project(la, ln)).map((p) => `${p.x},${p.y}`).join(" "), []);
  const routeIds = new Set(route.map((r) => r.location.id));
  const pts = route.map((r) => ({ ...project(r.location.lat, r.location.lng), r }));
  const routeKey = route.map((r) => r.location.id).join("|");

  let vw = W / zoom;
  let vh = H / zoom;
  let vx = (W - vw) / 2 - pan.x;
  let vy = (H - vh) / 2 - pan.y;
  if (compact && pts.length > 1) {
    // Thumbnail: frame the route with room for labels.
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 45;
    vx = Math.min(...xs) - pad;
    vy = Math.min(...ys) - pad;
    vw = Math.max(...xs) - vx + pad;
    vh = Math.max(...ys) - vy + pad;
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("[data-marker]")) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svgRef.current) return;
    const scale = vw / svgRef.current.clientWidth;
    setPan({ x: drag.current.px + (e.clientX - drag.current.x) * scale, y: drag.current.py + (e.clientY - drag.current.y) * scale });
  }

  return (
    <div className={clsx(!/\babsolute\b/.test(className ?? "") && "relative", "overflow-hidden bg-sea", className)}>
      <svg
        ref={svgRef}
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
        className="size-full touch-none select-none"
        role="img"
        aria-label={`Map of Sri Lanka with ${route.length} planned stops`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.15 : 0.87))))}
      >
        <polygon points={coast} fill="var(--land)" stroke="var(--land-line)" strokeWidth={1.5 / zoom} strokeLinejoin="round" />

        {pts.length > 1 && (
          <polyline
            key={routeKey}
            className="route-draw"
            style={{ ["--route-length" as string]: 3000 }}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={4 / zoom}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {!routeOnly &&
          places
            .filter((p) => !routeIds.has(p.id))
            .map((p) => {
              const { x, y } = project(p.lat, p.lng);
              const faded = fadedRegions?.has(p.region);
              return (
                <g
                  key={p.id}
                  data-marker
                  role="button"
                  tabIndex={0}
                  aria-label={p.name}
                  onClick={() => onSelect?.(p)}
                  onKeyDown={(e) => e.key === "Enter" && onSelect?.(p)}
                  className="cursor-pointer outline-none"
                  opacity={faded ? 0.3 : 1}
                >
                  <circle cx={x} cy={y} r={9 / zoom} fill="transparent" />
                  <circle cx={x} cy={y} r={(p.id === selectedId ? 5 : 3.5) / zoom} fill={p.id === selectedId ? "var(--signal)" : "var(--label2)"} stroke="var(--card)" strokeWidth={1.2 / zoom} />
                  {zoom >= 1.8 && (
                    <text x={x + 7 / zoom} y={y + 3 / zoom} fontSize={10 / zoom} fill="var(--label2)">
                      {p.name}
                    </text>
                  )}
                </g>
              );
            })}

        {suggestion && (() => {
          const { x, y } = project(suggestion.lat, suggestion.lng);
          return (
            <g aria-hidden>
              <circle cx={x} cy={y} r={7 / zoom} fill="var(--signal-t)" stroke="var(--signal)" strokeWidth={2 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />
              <text
                x={x}
                y={y + 20 / zoom}
                textAnchor="middle"
                fontSize={10 / zoom}
                fontWeight={700}
                fill="var(--signal-ink)"
                stroke="var(--land)"
                strokeWidth={3 / zoom}
                paintOrder="stroke"
                className="font-display"
              >
                + {suggestion.name.toUpperCase()}
              </text>
            </g>
          );
        })()}

        {pts.map(({ x, y, r }, i) => {
          const isEnd = i === 0 || i === pts.length - 1;
          const selected = r.location.id === selectedId;
          const size = 7 / zoom;
          const labelLeft = x > W * 0.62;
          return (
            <g
              key={`${r.location.id}-${i}`}
              data-marker
              role="button"
              tabIndex={0}
              aria-label={`Stop ${i + 1}: ${r.location.name}`}
              onClick={() => onSelect?.(r.location)}
              onKeyDown={(e) => e.key === "Enter" && onSelect?.(r.location)}
              className="cursor-pointer outline-none"
            >
              {isEnd ? (
                <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx={2 / zoom} fill={selected ? "var(--signal)" : "var(--card)"} stroke="var(--accent)" strokeWidth={3 / zoom} />
              ) : (
                <circle cx={x} cy={y} r={size} fill={selected ? "var(--signal)" : "var(--card)"} stroke="var(--accent)" strokeWidth={3 / zoom} />
              )}
              <g transform={`translate(${labelLeft ? x - 12 / zoom : x + 12 / zoom}, ${y + 4 / zoom})`}>
                <text
                  textAnchor={labelLeft ? "end" : "start"}
                  fontSize={11 / zoom}
                  fontWeight={700}
                  letterSpacing={0.5 / zoom}
                  fill="var(--label)"
                  stroke="var(--card)"
                  strokeWidth={3 / zoom}
                  paintOrder="stroke"
                  className="font-display"
                >
                  {r.location.name.toUpperCase()}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      <div className={clsx("absolute bottom-4 right-4 flex-col gap-2", compact ? "hidden" : "flex")}>
        <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.4))} className="glass grid size-10 place-items-center rounded-full shadow-float">
          <Plus className="size-4" />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => {
            setZoom((z) => Math.max(1, z / 1.4));
            if (zoom / 1.4 <= 1) setPan({ x: 0, y: 0 });
          }}
          className="glass grid size-10 place-items-center rounded-full shadow-float"
        >
          <Minus className="size-4" />
        </button>
      </div>
    </div>
  );
}
