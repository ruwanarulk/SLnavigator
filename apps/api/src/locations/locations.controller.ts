import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CATEGORIES, INTERESTS, REGIONS } from '@sln/core';
import { LOCATION_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';

class LocationQuery {
  @IsOptional() @IsIn(CATEGORIES.map((c) => c.id)) category?: string;
  @IsOptional() @IsIn(REGIONS.map((r) => r.id)) region?: string;
  @IsOptional() @IsIn(INTERESTS.map((i) => i.id)) tag?: string;
  @IsOptional() @IsString() @MaxLength(60) q?: string;
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: LocationQuery) {
    const where: Prisma.LocationWhereInput = {
      // Places travellers picked from Google search are private to their trips.
      source: 'CURATED',
      category: query.category,
      region: query.region,
      tags: query.tag ? { has: query.tag } : undefined,
      name: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };
    return this.prisma.location.findMany({
      where,
      select: LOCATION_CARD,
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    });
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const location = await this.prisma.location.findUnique({ where: { slug } });
    if (!location) throw new NotFoundException('Place not found');
    const nearby = await this.prisma.location.findMany({
      where: {
        id: { not: location.id },
        source: 'CURATED',
        lat: { gte: location.lat - 0.25, lte: location.lat + 0.25 },
        lng: { gte: location.lng - 0.25, lte: location.lng + 0.25 },
      },
      select: LOCATION_CARD,
      take: 6,
      orderBy: { rating: 'desc' },
    });
    return { ...location, nearby };
  }
}
