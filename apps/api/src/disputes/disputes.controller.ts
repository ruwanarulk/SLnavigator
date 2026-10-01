import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { DisputeReason } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { DisputesService } from './disputes.service';

class RaiseDto {
  @IsEnum(DisputeReason) reason: DisputeReason;
  @IsString() @MaxLength(2000) details: string;
}

class ResolveDto {
  @IsString() @MaxLength(1500) resolution: string;
}

class StatusQuery {
  @IsOptional() @IsIn(['OPEN', 'RESOLVED']) status?: 'OPEN' | 'RESOLVED';
}

@Controller('bookings/:id/disputes')
@Authenticated()
export class BookingDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  list(@CurrentUser() u: SessionUser, @Param('id') id: string) {
    return this.disputes.list(u.id, id);
  }

  @Post()
  @HttpCode(201)
  raise(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() dto: RaiseDto) {
    return this.disputes.raise(u.id, id, dto);
  }
}

@Controller('admin/disputes')
@Authenticated('ADMIN')
export class AdminDisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get()
  list(@Query() q: StatusQuery) {
    return this.disputes.adminList(q.status ?? 'OPEN');
  }

  @Post(':id/resolve')
  @HttpCode(200)
  resolve(@CurrentUser() admin: SessionUser, @Param('id') id: string, @Body() dto: ResolveDto) {
    return this.disputes.resolve(admin.id, id, dto.resolution);
  }
}
