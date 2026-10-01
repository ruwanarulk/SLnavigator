import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin/admin.controller';
import { VerificationController } from './admin/verification.controller';
import { AdminDisputesController, BookingDisputesController } from './disputes/disputes.controller';
import { DisputesService } from './disputes/disputes.service';
import { MessagingController } from './messaging/messaging.controller';
import { MessagingService } from './messaging/messaging.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ProviderController } from './provider/provider.controller';
import { ProviderService } from './provider/provider.service';
import { AuthController } from './auth/auth.controller';
import { RequireAuthGuard } from './auth/auth.decorators';
import { AuthService } from './auth/auth.service';
import { SessionGuard } from './auth/session.guard';
import { FxController } from './fx/fx.controller';
import { ItinerariesController } from './itineraries/itineraries.controller';
import { LocationsController } from './locations/locations.controller';
import { MeController } from './me/me.controller';
import { PlacesController } from './places/places.controller';
import { BookingsController, TripChoiceController } from './bookings/bookings.controller';
import { BookingsService } from './bookings/bookings.service';
import { ProviderRequestsController, TripPostController } from './posts/posts.controller';
import { BookingReviewController, CronController, ProviderReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';
import { PostsService } from './posts/posts.service';
import { PlannerController } from './planner/planner.controller';
import { PrismaModule } from './prisma/prisma.service';
import { ProvidersController } from './providers/providers.controller';
import { LegsService } from './trips/legs.service';
import { TripsController } from './trips/trips.controller';
import { TripsService } from './trips/trips.service';

@Controller('health')
class HealthController {
  @Get()
  ok() {
    return { ok: true };
  }
}

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    NotificationsModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be set (32+ characters)');
        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    MeController,
    LocationsController,
    ItinerariesController,
    ProvidersController,
    FxController,
    PlannerController,
    PlacesController,
    TripsController,
    AdminController,
    VerificationController,
    ProviderController,
    TripPostController,
    ProviderRequestsController,
    TripChoiceController,
    BookingsController,
    MessagingController,
    BookingReviewController,
    ProviderReviewsController,
    CronController,
    BookingDisputesController,
    AdminDisputesController,
  ],
  providers: [
    AuthService,
    ProviderService,
    PostsService,
    BookingsService,
    MessagingService,
    ReviewsService,
    DisputesService,
    TripsService,
    LegsService,
    RequireAuthGuard,
    // Reports unexpected (5xx) errors; normal HTTP errors like 404/401 are not sent.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
