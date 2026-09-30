import { Body, Controller, Patch } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CURRENCIES, INTERESTS } from '@sln/core';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { publicUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) name?: string;
  @IsOptional() @IsIn(CURRENCIES) currency?: string;
  @IsOptional() @IsIn(['en']) language?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(INTERESTS.length) @IsIn(INTERESTS.map((i) => i.id), { each: true })
  interests?: string[];
}

@Controller('me')
@Authenticated()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch()
  async update(@CurrentUser() session: SessionUser, @Body() dto: UpdateMeDto) {
    const user = await this.prisma.user.update({ where: { id: session.id }, data: dto });
    return publicUser(user);
  }
}
