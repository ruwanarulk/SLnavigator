import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { RequireAuthGuard } from './auth/auth.decorators';
import { AuthService } from './auth/auth.service';
import { SessionGuard } from './auth/session.guard';
import { FxController } from './fx/fx.controller';
import { ItinerariesController } from './itineraries/itineraries.controller';
import { LocationsController } from './locations/locations.controller';
import { MeController } from './me/me.controller';
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
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
    TripsController,
    AdminController,
  ],
  providers: [
    AuthService,
    TripsService,
    LegsService,
    RequireAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
