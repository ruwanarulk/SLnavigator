import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { BookingsService } from './bookings.service';

class ShortlistDto {
  @IsBoolean() shortlisted: boolean;
}

class CancelDto {
  @IsString() @MinLength(5) @MaxLength(500) reason: string;
}

/** The traveller choosing between bids. */
@Controller('trips/:tripId')
@Authenticated()
export class TripChoiceController {
  constructor(private readonly bookings: BookingsService) {}

  @Put('bids/:bidId/shortlist')
  shortlist(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string, @Param('bidId') bidId: string, @Body() dto: ShortlistDto) {
    return this.bookings.shortlist(u.id, tripId, bidId, dto.shortlisted);
  }

  @Post('bids/:bidId/accept')
  @HttpCode(201)
  accept(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string, @Param('bidId') bidId: string) {
    return this.bookings.accept(u.id, tripId, bidId);
  }

  @Get('booking')
  forTrip(@CurrentUser() u: SessionUser, @Param('tripId') tripId: string) {
    return this.bookings.forTrip(u.id, tripId);
  }
}

/** Bookings, seen by either the traveller or the provider on them. */
@Controller('bookings')
@Authenticated()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@CurrentUser() u: SessionUser) {
    return this.bookings.list(u.id);
  }

  @Get(':id')
  get(@CurrentUser() u: SessionUser, @Param('id') id: string) {
    return this.bookings.get(u.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.bookings.cancel(u.id, id, dto.reason);
  }
}
