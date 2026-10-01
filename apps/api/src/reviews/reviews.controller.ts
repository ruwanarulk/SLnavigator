import { Body, Controller, Get, Headers, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { IsBoolean, IsObject, IsString, MaxLength } from 'class-validator';
import { timingSafeEqual } from 'node:crypto';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { ReviewsService } from './reviews.service';

class SubmitReviewDto {
  @IsObject() scores: Record<string, number>;
  @IsBoolean() recommend: boolean;
  @IsString() @MaxLength(2000) text: string;
}

@Controller('bookings/:id/review')
@Authenticated()
export class BookingReviewController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  state(@CurrentUser() u: SessionUser, @Param('id') id: string) {
    return this.reviews.state(u.id, id);
  }

  @Post()
  @HttpCode(201)
  submit(@CurrentUser() u: SessionUser, @Param('id') id: string, @Body() dto: SubmitReviewDto) {
    return this.reviews.submit(u.id, id, dto);
  }
}

/** Reviews that travellers wrote and that have been revealed. Public, like the rest of a profile. */
@Controller('providers/:slug/reviews')
export class ProviderReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Param('slug') slug: string) {
    return this.reviews.publicReviews(slug);
  }
}

/** Called by Vercel Cron once a day with `Authorization: Bearer $CRON_SECRET`. Disabled when no secret is set. */
@Controller('cron')
export class CronController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('reminders')
  reminders(@Headers('authorization') auth?: string) {
    const secret = process.env.CRON_SECRET;
    const expected = Buffer.from(`Bearer ${secret ?? ''}`);
    const given = Buffer.from(auth ?? '');
    if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) throw new NotFoundException();
    return this.reviews.sendReminders();
  }
}
