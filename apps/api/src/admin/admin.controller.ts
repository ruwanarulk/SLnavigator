import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ProviderType, VerificationStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { REGIONS } from '@sln/core';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

class ProviderInput {
  @Matches(/^[a-z0-9-]{3,60}$/) slug: string;
  @IsEnum(ProviderType) type: ProviderType;
  @IsString() @MinLength(2) @MaxLength(80) displayName: string;
  @IsString() @MaxLength(60) city: string;
  @IsString() @MaxLength(2000) bio: string;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) languages: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) specialties: string[];
  @IsArray() @IsIn(REGIONS.map((r) => r.id), { each: true }) areas: string[];
  @IsOptional() @IsInt() @Min(0) @Max(60) yearsActive?: number;
  @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @IsOptional() @IsInt() @Min(0) priceFromUsd?: number;
  @IsOptional() @IsInt() @Min(0) priceToUsd?: number;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() isSample?: boolean;
  /** Required whenever the verification status changes. */
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

class ProviderPatch {
  @IsOptional() @Matches(/^[a-z0-9-]{3,60}$/) slug?: string;
  @IsOptional() @IsEnum(ProviderType) type?: ProviderType;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) displayName?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) specialties?: string[];
  @IsOptional() @IsArray() @IsIn(REGIONS.map((r) => r.id), { each: true }) areas?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(60) yearsActive?: number;
  @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @IsOptional() @IsInt() @Min(0) priceFromUsd?: number;
  @IsOptional() @IsInt() @Min(0) priceToUsd?: number;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() isSample?: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

class LocationPatch {
  @IsOptional() @IsInt() @Min(0) @Max(500) entryFeeUsd?: number;
  @IsOptional() @IsString() @MaxLength(80) openingHours?: string;
  @IsOptional() @IsString() @MaxLength(120) bestTime?: string;
  @IsOptional() @IsString() @MaxLength(300) summary?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsString() @MaxLength(500) accessibility?: string;
  @IsOptional() @IsString() @MaxLength(500) safety?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
  /** Marks fees and hours as checked against an official source today. */
  @IsOptional() @IsBoolean() markVerified?: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

class AuditQuery {
  @IsOptional() @IsString() @MaxLength(40) targetId?: string;
}

@Controller('admin')
@Authenticated('ADMIN')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('providers')
  providers() {
    return this.prisma.providerProfile.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  @Post('providers')
  async createProvider(@CurrentUser() admin: SessionUser, @Body() { note, ...data }: ProviderInput) {
    const provider = await this.prisma.providerProfile.create({ data });
    await this.audit(admin.id, 'provider.create', 'ProviderProfile', provider.id, note);
    return provider;
  }

  @Patch('providers/:id')
  async updateProvider(@CurrentUser() admin: SessionUser, @Param('id') id: string, @Body() { note, ...data }: ProviderPatch) {
    const before = await this.prisma.providerProfile.findUnique({ where: { id } });
    if (!before) throw new NotFoundException();
    const provider = await this.prisma.providerProfile.update({ where: { id }, data });
    const statusChanged = data.verificationStatus && data.verificationStatus !== before.verificationStatus;
    await this.audit(
      admin.id,
      statusChanged ? `provider.${data.verificationStatus!.toLowerCase()}` : 'provider.update',
      'ProviderProfile',
      id,
      note,
    );
    return provider;
  }

  @Get('locations')
  locations() {
    return this.prisma.location.findMany({ where: { source: 'CURATED' }, orderBy: [{ verifiedAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }] });
  }

  @Patch('locations/:id')
  async updateLocation(@CurrentUser() admin: SessionUser, @Param('id') id: string, @Body() dto: LocationPatch) {
    const { markVerified, note, ...data } = dto;
    const exists = await this.prisma.location.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException();
    const location = await this.prisma.location.update({
      where: { id },
      data: { ...data, verifiedAt: markVerified ? new Date() : undefined },
    });
    await this.audit(admin.id, markVerified ? 'location.verify' : 'location.update', 'Location', id, note);
    return location;
  }

  @Get('audit')
  auditLog(@Query() q: AuditQuery) {
    return this.prisma.auditLog.findMany({
      where: { targetId: q.targetId },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Deliberately fails so ops can confirm errors reach Sentry. */
  @Post('debug/sentry')
  debugSentry(): never {
    throw new Error('Sentry test error from the Navigator API (triggered by an admin)');
  }

  private audit(actorId: string, action: string, targetType: string, targetId: string, notes?: string) {
    return this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId, notes } });
  }
}
