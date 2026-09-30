import { Injectable, Logger } from '@nestjs/common';
import { estimateLeg, legTerrain, type LatLng, type LegEstimate, type TransportMode } from '@sln/core';

type Place = LatLng & { region: string };

const ROAD_MODES: TransportMode[] = ['CAR_DRIVER', 'SELF_DRIVE', 'TUK_TUK'];
/** Tuk-tuks share the road network but crawl on highways and hills. */
const TUK_TUK_SLOWDOWN = 1.6;

/**
 * Drive time and distance between stops. Uses the Google Routes API for road
 * modes when GOOGLE_MAPS_SERVER_KEY is set; otherwise, and for trains/buses
 * (Google has no reliable Sri Lankan transit data), falls back to estimates.
 */
@Injectable()
export class LegsService {
  private readonly log = new Logger(LegsService.name);
  private readonly cache = new Map<string, { distanceKm: number; durationMin: number }>();
  private readonly key = process.env.GOOGLE_MAPS_SERVER_KEY;

  async leg(from: Place, to: Place, mode: TransportMode): Promise<LegEstimate> {
    const fallback = estimateLeg(from, to, mode, legTerrain(from.region, to.region));
    if (!this.key || !ROAD_MODES.includes(mode)) return fallback;
    const road = await this.googleDrive(from, to);
    if (!road) return fallback;
    const factor = mode === 'TUK_TUK' ? TUK_TUK_SLOWDOWN : 1;
    return {
      distanceKm: road.distanceKm,
      durationMin: Math.round((road.durationMin * factor) / 5) * 5,
      source: 'google',
    };
  }

  private async googleDrive(from: LatLng, to: LatLng) {
    const cacheKey = [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(4)).join(',');
    const hit = this.cache.get(cacheKey);
    if (hit) return hit;
    try {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.key!,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
          destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
          travelMode: 'DRIVE',
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Routes API ${res.status}`);
      const body = (await res.json()) as { routes?: { duration: string; distanceMeters: number }[] };
      const route = body.routes?.[0];
      if (!route) return null;
      const value = {
        distanceKm: Math.round(route.distanceMeters / 1000),
        durationMin: Math.round(parseInt(route.duration, 10) / 60),
      };
      this.cache.set(cacheKey, value);
      return value;
    } catch (e) {
      this.log.warn(`Falling back to estimate: ${(e as Error).message}`);
      return null;
    }
  }
}
