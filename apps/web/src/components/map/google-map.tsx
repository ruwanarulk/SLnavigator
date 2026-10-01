"use client";

import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  ColorScheme,
  Map,
  Polyline,
  useApiLoadingStatus,
  useMap,
} from "@vis.gl/react-google-maps";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { markGoogleFailed } from "./google-status";
import type { TripMapProps } from "./types";

const SRI_LANKA = { lat: 7.85, lng: 80.7 };
/** Centre each marker's dot on its coordinates (Google defaults to bottom-centre). */
const DOT_ANCHOR = "-50%";

/** How long Google's script may take to load before we assume it's blocked. */
const SCRIPT_TIMEOUT_MS = 20_000;

/**
 * Detects a Google failure: the loader's status, Google's own error overlay
 * (e.g. RefererNotAllowedMapError), or a script that never loads. A map that
 * is merely slow to draw (weak signal) is left alone.
 */
function FailureWatch({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  const status = useApiLoadingStatus();
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) markGoogleFailed();
  }, [status]);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (el.querySelector(".gm-err-container, .gm-err-title")) markGoogleFailed();
    });
    observer.observe(el, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      if (statusRef.current !== APILoadingStatus.LOADED) markGoogleFailed();
    }, SCRIPT_TIMEOUT_MS);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [container]);
  return null;
}

/** The whole island, for maps with no route (Explore, an empty planner). */
const ISLAND_BOUNDS = { north: 9.85, south: 5.9, west: 79.65, east: 81.9 };
/** Extra room on the right, where station names hang off their dots. */
const ROUTE_PADDING = { top: 36, bottom: 36, left: 36, right: 110 };

/** Frames the route (or the island) and refits whenever the stops change. */
function FitRoute({ route }: Pick<TripMapProps, "route">) {
  const map = useMap();
  const key = route.map((r) => `${r.location.lat},${r.location.lng}`).join("|");
  useEffect(() => {
    if (!map) return;
    const fit = () => {
      if (route.length === 1) {
        map.setCenter(route[0].location);
        map.setZoom(10);
        return;
      }
      if (route.length === 0) {
        map.fitBounds(ISLAND_BOUNDS, 16);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      route.forEach((r) => bounds.extend({ lat: r.location.lat, lng: r.location.lng }));
      map.fitBounds(bounds, ROUTE_PADDING);
    };
    fit();
    // A fit issued before the first render can be lost; repeat it once the map is idle.
    const idle = google.maps.event.addListenerOnce(map, "idle", fit);
    return () => idle.remove();
    // Refit only when the stops themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function GoogleTripMap({
  apiKey,
  places,
  route,
  selectedId,
  onSelect,
  fadedRegions,
  routeOnly,
  suggestion,
  compact,
  gestures = "cooperative",
  className,
}: TripMapProps & { apiKey: string }) {
  const routeIds = new Set(route.map((r) => r.location.id));
  const container = useRef<HTMLDivElement>(null);
  return (
    <div ref={container} className={clsx(!/\babsolute\b/.test(className ?? "") && "relative", "overflow-hidden bg-sea", className)}>
      <APIProvider apiKey={apiKey} onError={markGoogleFailed}>
        <FailureWatch container={container} />
        <Map
          defaultCenter={SRI_LANKA}
          defaultZoom={7.2}
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "DEMO_MAP_ID"}
          colorScheme={ColorScheme.FOLLOW_SYSTEM}
          gestureHandling={compact ? "none" : gestures}
          disableDefaultUI
          zoomControl={!compact}
          keyboardShortcuts={!compact}
          clickableIcons={false}
          // Lets fitBounds pick an exact zoom instead of rounding down a whole level.
          isFractionalZoomEnabled
          className="size-full"
        >
          <FitRoute route={route} />
          {route.length > 1 && (
            <Polyline
              path={route.map((r) => ({ lat: r.location.lat, lng: r.location.lng }))}
              strokeColor="#006B6B"
              strokeWeight={4}
              strokeOpacity={0.95}
              geodesic
            />
          )}
          {!routeOnly &&
            places
              .filter((p) => !routeIds.has(p.id))
              .map((p) => (
                <AdvancedMarker
                  key={p.id}
                  position={p}
                  title={p.name}
                  onClick={() => onSelect?.(p)}
                  anchorLeft={DOT_ANCHOR}
                  anchorTop={DOT_ANCHOR}
                >
                  <span
                    className={clsx(
                      "block rounded-full border-2 border-card",
                      p.id === selectedId ? "size-4 bg-signal" : "size-3 bg-label2",
                      fadedRegions?.has(p.region) && "opacity-30",
                    )}
                  />
                </AdvancedMarker>
              ))}
          {suggestion && (
            <AdvancedMarker position={suggestion} title={`Suggested: ${suggestion.name}`} anchorLeft={DOT_ANCHOR} anchorTop={DOT_ANCHOR}>
              <span className="relative block size-4 rounded-full border-2 border-dashed border-signal bg-signal-t">
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-signal-t px-2 py-0.5 font-display text-[11px] font-bold text-signal-ink">
                  + {suggestion.name.toUpperCase()}
                </span>
              </span>
            </AdvancedMarker>
          )}
          {route.map((r, i) => (
            <AdvancedMarker
              key={`${r.location.id}-${i}`}
              position={r.location}
              title={`Stop ${i + 1}: ${r.location.name}`}
              onClick={() => onSelect?.(r.location)}
              zIndex={100 + i}
              anchorLeft={DOT_ANCHOR}
              anchorTop={DOT_ANCHOR}
            >
              {/* Only the station is measured for the anchor; the label hangs off to the right. */}
              <span
                className={clsx(
                  "relative block size-4 border-[3px] border-accent",
                  i === 0 || i === route.length - 1 ? "rounded-[3px]" : "rounded-full",
                  r.location.id === selectedId ? "bg-signal" : "bg-card",
                )}
              >
                <span className="absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded bg-card/90 px-1 font-display text-[12px] font-bold tracking-wide text-label">
                  {r.location.name.toUpperCase()}
                </span>
              </span>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
