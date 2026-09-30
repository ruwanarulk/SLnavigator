"use client";

import { GoogleTripMap } from "./google-map";
import { useGoogleFailed } from "./google-status";
import { IslandMap } from "./island-map";
import type { TripMapProps } from "./types";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Google Maps when a browser key is configured and working, otherwise the built-in island map. */
export function TripMap(props: TripMapProps) {
  const failed = useGoogleFailed();
  return KEY && !failed ? <GoogleTripMap apiKey={KEY} {...props} /> : <IslandMap {...props} />;
}
