/**
 * Minimal client for Google's Places API (New), called straight from the
 * browser with the referrer-restricted browser key. Autocomplete and the
 * Place Details call that ends it share one session token, which is how
 * Google bills a search as a single session rather than per keystroke.
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BASE = "https://places.googleapis.com/v1";

/** Sri Lanka and its waters; results outside are never returned. */
const SRI_LANKA = { low: { latitude: 5.8, longitude: 79.4 }, high: { latitude: 9.95, longitude: 82.0 } };

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  secondary: string;
}

export interface PickedPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export class PlacesUnavailableError extends Error {}

export const googlePlacesConfigured = !!KEY;

// Once Google refuses the key for Places (API not enabled, key restricted),
// stop asking for the rest of the visit and fall back to curated results only.
let unavailable = false;
export const googlePlacesAvailable = () => googlePlacesConfigured && !unavailable;

export function newSessionToken() {
  return crypto.randomUUID();
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY!, ...init.headers },
  });
  if (res.status === 403 || res.status === 401) {
    unavailable = true;
    throw new PlacesUnavailableError("Google Places refused the request");
  }
  if (!res.ok) throw new Error(`Google Places ${res.status}`);
  return res.json() as Promise<T>;
}

export async function autocompletePlaces(input: string, sessionToken: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const data = await call<{
    suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } }[];
  }>(`${BASE}/places:autocomplete`, {
    method: "POST",
    signal,
    body: JSON.stringify({
      input,
      sessionToken,
      languageCode: "en",
      includedRegionCodes: ["lk"],
      locationRestriction: { rectangle: SRI_LANKA },
    }),
  });
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      placeId: p.placeId,
      name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((p) => p.name);
}

/** Resolves a chosen suggestion to coordinates; this call ends the billing session. */
export async function getPlace(placeId: string, sessionToken: string): Promise<PickedPlace> {
  const data = await call<{ id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } }>(
    `${BASE}/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`,
    { method: "GET", headers: { "X-Goog-FieldMask": "id,displayName,formattedAddress,location" } },
  );
  if (!data.location) throw new Error("Place has no location");
  return {
    placeId: data.id,
    name: data.displayName?.text ?? "",
    address: data.formattedAddress ?? "",
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}
