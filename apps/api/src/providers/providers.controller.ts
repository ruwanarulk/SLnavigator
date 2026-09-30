import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { REGIONS } from '@sln/core';
import { PROVIDER_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';

class ProviderQuery {
  @IsOptional() @IsEnum(ProviderType) type?: ProviderType;
  @IsOptional() @IsIn(REGIONS.map((r) => r.id)) area?: string;
  @IsOptional() @IsString() @MaxLength(30) language?: string;
  @IsOptional() @IsString() @MaxLength(30) specialty?: string;
}

/** Public directory. Only approved profiles are ever visible to travellers. */
@Controller('providers')
export class ProvidersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() q: ProviderQuery) {
    return this.prisma.providerProfile.findMany({
      where: {
        verificationStatus: 'APPROVED',
        type: q.type,
        areas: q.area ? { has: q.area } : undefined,
        languages: q.language ? { has: q.language } : undefined,
        specialties: q.specialty ? { has: q.specialty } : undefined,
      },
      select: PROVIDER_CARD,
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    });
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const provider = await this.prisma.providerProfile.findFirst({
      where: { slug, verificationStatus: 'APPROVED' },
      select: PROVIDER_CARD,
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }
}
