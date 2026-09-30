import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TransportMode, TripStatus } from '@prisma/client';
import { BUDGET_LEVELS, STAY_TIERS } from '@sln/core';

export const MAX_STOPS = 30;

export class StopInput {
  @IsString() @MaxLength(40) locationId: string;
  @IsInt() @Min(0) @Max(30) nights: number;
  @IsEnum(TransportMode) modeToNext: TransportMode;
}

export class BudgetSettingsInput {
  @IsIn(STAY_TIERS) stayTier: (typeof STAY_TIERS)[number];
  @IsIn(BUDGET_LEVELS) foodLevel: (typeof BUDGET_LEVELS)[number];
  @IsInt() @Min(0) @Max(60) guideDays: number;
  @IsInt() @Min(0) @Max(50) bufferPct: number;
}

export class CreateTripDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) title?: string;
  @IsOptional() @IsString() @MaxLength(80) itinerarySlug?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) travelers?: number;
  @IsOptional() @ValidateNested() @Type(() => BudgetSettingsInput) budget?: BudgetSettingsInput;
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_STOPS) @ValidateNested({ each: true }) @Type(() => StopInput)
  stops?: StopInput[];
}

export class UpdateTripDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) title?: string;
  /** ISO date, or null to clear. */
  @IsOptional() @IsDateString() startDate?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(20) travelers?: number;
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;
  @IsOptional() @ValidateNested() @Type(() => BudgetSettingsInput) budget?: BudgetSettingsInput;
}

export class SetStopsDto {
  @IsArray() @ArrayMaxSize(MAX_STOPS) @ValidateNested({ each: true }) @Type(() => StopInput)
  stops: StopInput[];
}

export class ListTripsQuery {
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;
}
