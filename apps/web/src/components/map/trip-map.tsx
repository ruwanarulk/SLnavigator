"use client";

import { useSyncExternalStore } from "react";
import { GoogleTripMap } from "./google-map";
import { IslandMap } from "./island-map";
import type { TripMapProps } from "./types";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Google calls window.gm_authFailure when it rejects the key (bad referrer,
// billing off, API disabled). Remember that so every map falls back.
let authFailed = false;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const w = window as unknown as { gm_authFailure?: () => void };
  w.gm_authFailure = () => {
    authFailed = true;
    listeners.forEach((l) => l());
  };
  return () => listeners.delete(onChange);
}

/** Google Maps when a browser key is configured and accepted, otherwise the built-in island map. */
export function TripMap(props: TripMapProps) {
  const failed = useSyncExternalStore(
    subscribe,
    () => authFailed,
    () => false,
  );
  return KEY && !failed ? <GoogleTripMap apiKey={KEY} {...props} /> : <IslandMap {...props} />;
}
