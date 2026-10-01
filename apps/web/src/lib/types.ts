import type { BudgetBreakdown, BudgetSettings, TransportMode } from "@sln/core";

export type ProviderType = "GUIDE" | "COMPANY" | "TRANSPORT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "TRAVELER" | "GUIDE" | "COMPANY" | "TRANSPORT" | "ADMIN";
  currency: string;
  language: string;
  interests: string[];
  /** Present for guide, company and transport accounts. */
  provider: { id: string; type: ProviderType; verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMITTED" } | null;
}

export const isProviderRole = (role: User["role"]) => role === "GUIDE" || role === "COMPANY" || role === "TRANSPORT";

export interface LocationCard {
  id: string;
  slug: string;
  name: string;
  nameSi: string | null;
  nameTa: string | null;
  category: string;
  region: string;
  tags: string[];
  lat: number;
  lng: number;
  summary: string;
  entryFeeUsd: number;
  avgDurationMin: number;
  openingHours: string | null;
  rating: number;
  reviewCount: number;
  imageUrl: string | null;
  hue: string;
  /** GOOGLE = picked from Google search (coordinates only). Missing on drafts saved before this existed. */
  source?: "CURATED" | "GOOGLE";
}

export interface LocationDetail extends LocationCard {
  description: string;
  bestTime: string | null;
  accessibility: string | null;
  safety: string | null;
  amenities: string[];
  verifiedAt: string | null;
  nearby: LocationCard[];
}

export interface Leg {
  distanceKm: number;
  durationMin: number;
  source: "estimate" | "google" | null;
}

export interface TripStop {
  id?: string;
  nights: number;
  modeToNext: TransportMode;
  leg: Leg | null;
  /** Client-only: `${nextLocationId}:${mode}` the leg was computed for. */
  legFor?: string;
  location: LocationCard;
}

export interface Trip {
  id: string;
  title: string;
  status: "DRAFT" | "ARCHIVED";
  startDate: string | null;
  travelers: number;
  days: number;
  budgetSettings: BudgetSettings;
  budget: BudgetBreakdown;
  itinerary: { slug: string; title: string } | null;
  totalTravelMin: number;
  stops: TripStop[];
  updatedAt: string;
}

export interface Itinerary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  days: number;
  hue: string;
  tags: string[];
  stops: { nights: number; modeToNext: TransportMode; location: LocationCard }[];
}

export interface Provider {
  id: string;
  slug: string;
  type: "GUIDE" | "COMPANY" | "TRANSPORT";
  displayName: string;
  city: string;
  bio: string;
  languages: string[];
  specialties: string[];
  areas: string[];
  yearsActive: number;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMITTED";
  rating: number;
  reviewCount: number;
  responseTimeMin: number | null;
  priceFromUsd: number | null;
  priceToUsd: number | null;
  isSample: boolean;
}

export interface FxRates {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string | null;
}

export interface Suggestion {
  location: LocationCard;
  nearStopName: string;
  distanceKm: number;
  extraMin: number;
  reason: string;
}
