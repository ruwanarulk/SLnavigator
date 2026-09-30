import type { Prisma } from '@prisma/client';

/** Fields a location card, map marker or route stop needs. */
export const LOCATION_CARD = {
  id: true,
  slug: true,
  name: true,
  nameSi: true,
  nameTa: true,
  category: true,
  region: true,
  tags: true,
  lat: true,
  lng: true,
  summary: true,
  entryFeeUsd: true,
  avgDurationMin: true,
  openingHours: true,
  rating: true,
  reviewCount: true,
  imageUrl: true,
  hue: true,
} satisfies Prisma.LocationSelect;

export type LocationCard = Prisma.LocationGetPayload<{ select: typeof LOCATION_CARD }>;

/** Directory card: no contact details, which stay on-platform. */
export const PROVIDER_CARD = {
  id: true,
  slug: true,
  type: true,
  displayName: true,
  city: true,
  bio: true,
  languages: true,
  specialties: true,
  areas: true,
  yearsActive: true,
  verificationStatus: true,
  rating: true,
  reviewCount: true,
  responseTimeMin: true,
  priceFromUsd: true,
  priceToUsd: true,
  isSample: true,
} satisfies Prisma.ProviderProfileSelect;
