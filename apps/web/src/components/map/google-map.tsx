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

function FitRoute({ route }: Pick<TripMapProps, "route">) {
  const map = useMap();
  const key = route.map((r) => r.location.id).join("|");
  useEffect(() => {
    if (!map || route.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    route.forEach((r) => bounds.extend({ lat: r.location.lat, lng: r.location.lng }));
    map.fitBounds(bounds, 80);
    // Refit only when the set/order of stops changes.
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
          gestureHandling={compact ? "none" : "greedy"}
          disableDefaultUI
          zoomControl={!compact}
          keyboardShortcuts={!compact}
          clickableIcons={false}
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
                <AdvancedMarker key={p.id} position={p} title={p.name} onClick={() => onSelect?.(p)}>
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
            <AdvancedMarker position={suggestion} title={`Suggested: ${suggestion.name}`}>
              <span className="rounded-full border-2 border-dashed border-signal bg-signal-t px-2 py-0.5 font-display text-[12px] font-bold text-signal-ink">
                + {suggestion.name.toUpperCase()}
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
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    "block size-4 border-[3px] border-accent",
                    i === 0 || i === route.length - 1 ? "rounded-[3px]" : "rounded-full",
                    r.location.id === selectedId ? "bg-signal" : "bg-card",
                  )}
                />
                <span className="rounded bg-card/90 px-1 font-display text-[12px] font-bold tracking-wide text-label">
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
