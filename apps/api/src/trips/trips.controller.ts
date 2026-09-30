import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { CreateTripDto, ListTripsQuery, SetStopsDto, UpdateTripDto } from './trips.dto';
import { TripsService } from './trips.service';

@Controller('trips')
@Authenticated()
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query() q: ListTripsQuery) {
    return this.trips.list(user.id, q.status);
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.trips.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(user.id, id, dto);
  }

  /** Replaces the ordered stop list; used for add, remove, reorder and mode changes. */
  @Put(':id/stops')
  setStops(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: SetStopsDto) {
    return this.trips.setStops(user.id, id, dto.stops);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.trips.duplicate(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.trips.remove(user.id, id);
  }
}
