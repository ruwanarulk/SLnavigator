import { haversineKm, planRoute, seasonFor, type Region, type TransportMode } from '@sln/core';

export interface Candidate {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  tags: string[];
  lat: number;
  lng: number;
  rating: number;
  avgDurationMin: number;
}

export interface StarterStop {
  locationId: string;
  nights: number;
  modeToNext: TransportMode;
}

/** Legs between towns on the hill-country railway get the train by default. */
const HILL_LINE = ['kandy', 'nuwara-eliya', 'haputale', 'ella'];
const AIRPORT_CITY = 'colombo';
/** Places closer than this are "nearby add-ons", not separate overnight stops. */
const MIN_STOP_SPACING_KM = 30;
const NEARBY_KM = 25;
/** Categories where travellers actually sleep. */
const BASE_CATEGORIES = ['town', 'beach'];

/** The town or beach a traveller would stay at to visit `c` (itself if none is close). */
function baseFor(c: Candidate, all: Candidate[]): Candidate {
  if (BASE_CATEGORIES.includes(c.category)) return c;
  let best: Candidate | null = null;
  let bestKm = NEARBY_KM;
  for (const b of all) {
    if (!BASE_CATEGORIES.includes(b.category)) continue;
    const d = haversineKm(b, c);
    if (d < bestKm) {
      best = b;
      bestKm = d;
    }
  }
  return best ?? c;
}

function score(c: Candidate, interests: string[], month: number) {
  const matches = c.tags.filter((t) => interests.includes(t)).length;
  const season = seasonFor(c.region as Region, month);
  const seasonAdj = season === 'dry' ? 1 : season === 'monsoon' ? -1.5 : 0;
  return matches * 2 + c.rating / 5 + seasonAdj;
}

export function stopCountFor(days: number) {
  return Math.min(9, Math.max(3, Math.round(days / 1.6)));
}

export function defaultMode(fromSlug: string, toSlug: string): TransportMode {
  return HILL_LINE.includes(fromSlug) && HILL_LINE.includes(toSlug) && fromSlug !== toSlug ? 'TRAIN' : 'CAR_DRIVER';
}

/**
 * Builds a first-draft route from onboarding answers: the best-scoring,
 * well-spaced places, ordered from the airport city, with nights spread so
 * the trip lasts `days` in total (the final stop is the departure day).
 */
export function buildStarterRoute(
  all: Candidate[],
  interests: string[],
  days: number,
  month: number,
): StarterStop[] {
  const colombo = all.find((c) => c.slug === AIRPORT_CITY);
  const want = Math.min(stopCountFor(days), Math.max(1, days - 1));
  const ranked = all
    .filter((c) => c.slug !== AIRPORT_CITY)
    .map((c) => ({ c, s: score(c, interests, month) }))
    .sort((a, b) => b.s - a.s);

  // Overnight stops are bases; the attractions that earned them become nearby suggestions.
  const picked: Candidate[] = [];
  for (const { c } of ranked) {
    if (picked.length >= want) break;
    const base = baseFor(c, all);
    if (base.slug === AIRPORT_CITY) continue;
    if (picked.some((p) => p.id === base.id || haversineKm(p, base) < MIN_STOP_SPACING_KM)) continue;
    picked.push(base);
  }

  const start = colombo ?? picked[0];
  // Most visitors fly in and out of Colombo, so optimise as a loop back to it.
  const ordered = planRoute(start, picked, !!colombo);
  const route = colombo && days >= 7 ? [colombo, ...ordered] : ordered;

  const totalNights = Math.max(0, days - 1);
  const overnight = route.length > 1 ? route.length - 1 : 1;
  const nights = route.map((_, i) => (i < overnight ? Math.floor(totalNights / overnight) : 0));
  // Spare nights go to destinations first, the arrival city last.
  const order = [...Array(overnight).keys()].sort((a, b) => Number(route[a].slug === AIRPORT_CITY) - Number(route[b].slug === AIRPORT_CITY));
  for (let extra = totalNights - nights.reduce((s, n) => s + n, 0), k = 0; extra > 0; extra--, k++) {
    nights[order[k % order.length]] += 1;
  }

  return route.map((c, i) => {
    const next = route[i + 1];
    return { locationId: c.id, nights: nights[i], modeToNext: next ? defaultMode(c.slug, next.slug) : 'CAR_DRIVER' };
  });
}

export interface Suggestion {
  location: Candidate;
  nearStopName: string;
  distanceKm: number;
  extraMin: number;
  reason: string;
}

/** "You're near Ella, add Little Adam's Peak." Ranked by interest match, rating and closeness. */
export function suggestNearby(
  stops: Candidate[],
  all: Candidate[],
  interests: string[],
  limit = 5,
): Suggestion[] {
  if (!stops.length) return [];
  const inTrip = new Set(stops.map((s) => s.id));
  const out: (Suggestion & { s: number })[] = [];
  for (const c of all) {
    if (inTrip.has(c.id) || c.category === 'town') continue;
    let nearest = stops[0];
    let d = haversineKm(nearest, c);
    for (const s of stops) {
      const ds = haversineKm(s, c);
      if (ds < d) {
        d = ds;
        nearest = s;
      }
    }
    if (d > NEARBY_KM) continue;
    const matches = c.tags.filter((t) => interests.includes(t));
    out.push({
      location: c,
      nearStopName: nearest.name,
      distanceKm: Math.round(d),
      extraMin: c.avgDurationMin,
      reason: matches.length ? `Matches your interest in ${matches[0]}` : `Close to ${nearest.name}`,
      s: matches.length * 2 + c.rating - d / 10,
    });
  }
  return out
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ s: _s, ...rest }) => rest);
}
