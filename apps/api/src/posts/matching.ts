import type { ProviderType, ServiceNeed } from '@prisma/client';
import { INTERESTS } from '@sln/core';

export interface MatchProvider {
  type: ProviderType;
  areas: string[];
  languages: string[];
  specialties: string[];
}

export interface MatchRequest {
  need: ServiceNeed;
  /** Regions of the trip's stops. */
  regions: string[];
  interests: string[];
  languages: string[];
}

/** Guides and companies guide; drivers and companies drive. */
export function canServe(type: ProviderType, need: ServiceNeed) {
  if (need === 'TRANSPORT_ONLY') return type === 'TRANSPORT' || type === 'COMPANY';
  return type === 'GUIDE' || type === 'COMPANY';
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Does this request suit the provider? They must offer the service and cover at
 * least one region on the route. `tags` explains the fit, e.g. "Birding", "Speaks German".
 */
export function matchRequest(provider: MatchProvider, req: MatchRequest): { matches: boolean; tags: string[] } {
  const regionOverlap = req.regions.some((r) => provider.areas.includes(r));
  const matches = canServe(provider.type, req.need) && regionOverlap;

  const specialties = provider.specialties.map(norm);
  const tags: string[] = [];
  for (const id of req.interests) {
    const interest = INTERESTS.find((i) => i.id === id);
    if (!interest) continue;
    const label = norm(interest.label);
    const hit = provider.specialties.find((_, idx) => specialties[idx] === id || label.includes(specialties[idx]) || specialties[idx].includes(id));
    if (hit && !tags.includes(hit)) tags.push(hit);
  }
  const languages = provider.languages.map(norm);
  for (const l of req.languages) if (languages.includes(norm(l))) tags.push(`Speaks ${l}`);
  return { matches, tags };
}
