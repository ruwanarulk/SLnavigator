import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { MessagingService } from './messaging.service';

class OpenDto {
  @IsString() @MaxLength(40) tripId: string;
  /** Travellers say which provider; providers omit it. */
  @IsOptional() @IsString() @MaxLength(40) providerId?: string;
}

class SendDto {
  @IsString() @MaxLength(2100) body: string;
}

class AfterQuery {
  @IsOptional() @IsDateString() after?: string;
}

@Controller('conversations')
@Authenticated()
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  list(@CurrentUser() u: SessionUser) {
    return this.messaging.list(u.id);
  }

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  open(@CurrentUser() u: SessionUser, @Body() dto: OpenDto) {
    return this.messaging.open(u.id, dto);
  }

  /** Marks the thread read for the caller. `after` fetches only newer messages (polling). */
  @Get(':id')
  thread(@CurrentUser() u: SessionUser, @Param('id') id: string, @Query() q: AfterQuery) {
    return this.messaging.thread(u.id, id, q.after);
  }

  @Post(':id/messages')
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  send(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() dto: SendDto) {
    return this.messaging.send(u.id, id, dto.body);
  }
}
