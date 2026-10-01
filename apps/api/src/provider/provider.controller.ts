import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentKind } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { REGIONS } from '@sln/core';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_DOC_BYTES } from './requirements';
import { ProviderService } from './provider.service';

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(30, { each: true }) languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(30, { each: true }) specialties?: string[];
  @IsOptional() @IsArray() @IsIn(REGIONS.map((r) => r.id), { each: true }) areas?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(60) yearsActive?: number;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) licenceNumber?: string;
  @IsOptional() @IsString() @MaxLength(60) businessRegNo?: string;
  @IsOptional() @IsInt() @Min(0) @Max(5000) priceFromUsd?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) priceToUsd?: number;
}

class UploadDto {
  @IsEnum(DocumentKind) kind: DocumentKind;
}

const PROVIDER_ROLES = ['GUIDE', 'COMPANY', 'TRANSPORT'] as const;

/** A provider's own profile, verification documents and application. */
@Controller('provider')
@Authenticated(...PROVIDER_ROLES)
export class ProviderController {
  constructor(
    private readonly provider: ProviderService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('me')
  me(@CurrentUser() u: SessionUser) {
    return this.provider.me(u.id);
  }

  @Patch('me')
  update(@CurrentUser() u: SessionUser, @Body() dto: UpdateProfileDto) {
    const { displayName, ...rest } = dto;
    return this.provider.update(u.id, { ...rest, ...(displayName !== undefined ? { displayName: displayName.trim() } : {}) });
  }

  @Post('me/documents')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOC_BYTES, files: 1 } }))
  upload(@CurrentUser() u: SessionUser, @Body() dto: UploadDto, @UploadedFile() file?: Express.Multer.File) {
    return this.provider.upload(u.id, dto.kind, file);
  }

  @Delete('me/documents/:id')
  removeDocument(@CurrentUser() u: SessionUser, @Param('id') id: string) {
    return this.provider.removeDocument(u.id, id);
  }

  @Post('me/submit')
  @HttpCode(200)
  async submit(@CurrentUser() u: SessionUser) {
    const result = await this.provider.submit(u.id);
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await this.notifications.notifyMany(
      admins.map((a) => ({
        userId: a.id,
        type: 'provider.submitted',
        title: 'New provider application',
        body: `${result.displayName} (${result.type.toLowerCase()}, ${result.city}) is ready for verification.`,
        link: '/admin',
      })),
    );
    return result;
  }
}
