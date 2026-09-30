import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { INTERESTS } from '@sln/core';
import { LOCATION_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_STOPS } from '../trips/trips.dto';
import { buildStarterRoute, suggestNearby } from './planner.logic';

const INTEREST_IDS = INTERESTS.map((i) => i.id);

class StarterDto {
  @IsArray() @ArrayMaxSize(INTEREST_IDS.length) @IsIn(INTEREST_IDS, { each: true }) interests: string[];
  @IsInt() @Min(2) @Max(30) days: number;
  /** 0–11; defaults to the current month. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(11) month?: number;
}

class SuggestDto {
  @IsArray() @ArrayMaxSize(MAX_STOPS) @IsString({ each: true }) @MaxLength(40, { each: true }) locationIds: string[];
  @IsArray() @ArrayMaxSize(INTEREST_IDS.length) @IsIn(INTEREST_IDS, { each: true }) interests: string[];
}

/** Public planning helpers, usable before the traveller signs up. */
@Controller('planner')
export class PlannerController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('starter')
  @HttpCode(200)
  async starter(@Body() dto: StarterDto) {
    const all = await this.prisma.location.findMany({ select: LOCATION_CARD });
    const stops = buildStarterRoute(all, dto.interests, dto.days, dto.month ?? new Date().getMonth());
    const byId = new Map(all.map((l) => [l.id, l]));
    return { stops: stops.map((s) => ({ ...s, location: byId.get(s.locationId)! })) };
  }

  @Post('suggestions')
  @HttpCode(200)
  async suggestions(@Body() dto: SuggestDto) {
    const all = await this.prisma.location.findMany({ select: LOCATION_CARD });
    const byId = new Map(all.map((l) => [l.id, l]));
    const stops = dto.locationIds.map((id) => byId.get(id)).filter((l) => !!l);
    return suggestNearby(stops, all, dto.interests).map((s) => ({ ...s, location: byId.get(s.location.id)! }));
  }
}
