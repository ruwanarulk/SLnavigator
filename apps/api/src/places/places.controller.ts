import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { haversineKm } from '@sln/core';
import { LOCATION_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';

// Bounding box of Sri Lanka and its waters. Anything outside is not our island.
const LAT = { min: 5.8, max: 9.95 };
const LNG = { min: 79.4, max: 82.0 };

class CustomPlaceDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{10,200}$/) placeId: string;
  @IsString() @MinLength(1) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsNumber() @Min(LAT.min) @Max(LAT.max) lat: number;
  @IsNumber() @Min(LNG.min) @Max(LNG.max) lng: number;
}

/**
 * Stores a place a traveller picked from Google search so it can be a trip stop.
 * Public, because trips can be planned before signing up; throttled to limit abuse.
 */
@Controller('places')
export class PlacesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('custom')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async custom(@Body() dto: CustomPlaceDto) {
    const existing = await this.prisma.location.findUnique({ where: { googlePlaceId: dto.placeId }, select: LOCATION_CARD });
    if (existing) return existing;

    // Region, terrain and weather all come from the nearest hand-written place.
    const curated = await this.prisma.location.findMany({
      where: { source: 'CURATED' },
      select: { lat: true, lng: true, region: true, hue: true },
    });
    const nearest = curated.reduce((best, c) => (haversineKm(c, dto) < haversineKm(best, dto) ? c : best), curated[0]);
    const name = dto.name.trim();
    const address = dto.address?.trim() || null;

    return this.prisma.location.upsert({
      where: { googlePlaceId: dto.placeId },
      update: {},
      create: {
        slug: `place-${dto.placeId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-16)}`,
        name,
        category: 'custom',
        region: nearest?.region ?? 'west',
        hue: nearest?.hue ?? 'sand',
        tags: [],
        lat: dto.lat,
        lng: dto.lng,
        summary: address ?? name,
        description: address ?? name,
        avgDurationMin: 90,
        source: 'GOOGLE',
        googlePlaceId: dto.placeId,
        address,
      },
      select: LOCATION_CARD,
    });
  }
}
