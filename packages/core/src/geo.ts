import type { TransportMode } from './constants';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/**
 * How much longer than straight-line the real route is, and average
 * door-to-door km/h. Hill-country legs wind and climb; the hill railway
 * (Kandy–Ella, about 140 km in 7 h) is famously slow.
 */
const PROFILE: Record<'flat' | 'hill', Record<TransportMode, { factor: number; kmh: number }>> = {
  flat: {
    CAR_DRIVER: { factor: 1.35, kmh: 40 },
    SELF_DRIVE: { factor: 1.35, kmh: 40 },
    TUK_TUK: { factor: 1.35, kmh: 25 },
    BUS: { factor: 1.35, kmh: 30 },
    TRAIN: { factor: 1.35, kmh: 40 },
  },
  hill: {
    CAR_DRIVER: { factor: 1.6, kmh: 30 },
    SELF_DRIVE: { factor: 1.6, kmh: 30 },
    TUK_TUK: { factor: 1.6, kmh: 20 },
    BUS: { factor: 1.6, kmh: 22 },
    TRAIN: { factor: 2.1, kmh: 20 },
  },
};

export interface LegEstimate {
  distanceKm: number;
  durationMin: number;
  source: 'estimate' | 'google';
}

export type Terrain = 'flat' | 'hill';

/** Terrain of a leg: hill when both ends are in the hill country. */
export function legTerrain(fromRegion?: string, toRegion?: string): Terrain {
  return fromRegion === 'hill' && toRegion === 'hill' ? 'hill' : 'flat';
}

/** Offline estimate used when no routing API is configured. */
export function estimateLeg(from: LatLng, to: LatLng, mode: TransportMode, terrain: Terrain = 'flat'): LegEstimate {
  const p = PROFILE[terrain][mode];
  const distanceKm = Math.round(haversineKm(from, to) * p.factor);
  const durationMin = Math.max(10, Math.round(((distanceKm / p.kmh) * 60) / 5) * 5);
  return { distanceKm, durationMin, source: 'estimate' };
}

/**
 * Orders `points` into a short route from `start` using nearest-neighbour then
 * 2-opt. With `returnToStart`, the leg back to `start` counts too, which gives
 * the loop shape a round-island trip wants (ending near the airport).
 */
export function planRoute<T extends LatLng>(start: LatLng, points: T[], returnToStart = false): T[] {
  let route = orderByNearest(start, points);
  const cost = (r: T[]) => {
    let d = r.length ? haversineKm(start, r[0]) : 0;
    for (let i = 1; i < r.length; i++) d += haversineKm(r[i - 1], r[i]);
    return returnToStart && r.length ? d + haversineKm(r[r.length - 1], start) : d;
  };
  let best = cost(route);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const next = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        const c = cost(next);
        if (c < best - 1e-9) {
          route = next;
          best = c;
          improved = true;
        }
      }
    }
  }
  return route;
}

/**
 * Greedy nearest-neighbour ordering starting from `start`.
 * Good enough for 5–15 stops; the traveller can drag to reorder afterwards.
 */
export function orderByNearest<T extends LatLng>(start: LatLng, points: T[]): T[] {
  const remaining = [...points];
  const ordered: T[] = [];
  let cur = start;
  while (remaining.length) {
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (haversineKm(cur, remaining[i]) < haversineKm(cur, remaining[best])) best = i;
    }
    const [next] = remaining.splice(best, 1);
    ordered.push(next);
    cur = next;
  }
  return ordered;
}
