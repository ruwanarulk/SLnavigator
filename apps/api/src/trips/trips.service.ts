import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, TransportMode } from '@prisma/client';
import { DEFAULT_BUDGET, estimateBudget, tripDays, type BudgetSettings } from '@sln/core';
import { LOCATION_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';
import { LegsService } from './legs.service';
import type { CreateTripDto, StopInput, UpdateTripDto } from './trips.dto';

const TRIP_INCLUDE = {
  stops: { orderBy: { position: 'asc' }, include: { location: { select: LOCATION_CARD } } },
  itinerary: { select: { slug: true, title: true } },
  post: { select: { id: true, status: true, deadline: true, _count: { select: { bids: { where: { status: 'PENDING' } } } } } },
} satisfies Prisma.TripInclude;

/** Statuses that appear in the main My Trips list (archived trips have their own tab). */
const ACTIVE_STATUSES = ['DRAFT', 'POSTED', 'BOOKED', 'COMPLETED'] as const;

type TripWithStops = Prisma.TripGetPayload<{ include: typeof TRIP_INCLUDE }>;

function settingsOf(json: Prisma.JsonValue): BudgetSettings {
  return { ...DEFAULT_BUDGET, ...(json as Partial<BudgetSettings> | null) };
}

/** Shape the web app consumes: stops with legs, plus a computed budget in USD. */
export function toTripDto(t: TripWithStops) {
  const settings = settingsOf(t.budget);
  const nights = t.stops.map((s) => s.nights);
  const legs = t.stops.slice(0, -1).map((s) => ({ mode: s.modeToNext, distanceKm: s.legDistanceKm ?? 0 }));
  const budget = estimateBudget({
    travelers: t.travelers,
    nights: nights.reduce((a, n) => a + n, 0),
    entryFeesPerPerson: t.stops.map((s) => s.location.entryFeeUsd),
    legs,
    settings,
  });
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    startDate: t.startDate?.toISOString().slice(0, 10) ?? null,
    travelers: t.travelers,
    days: t.stops.length ? tripDays(nights) : 0,
    budgetSettings: settings,
    budget,
    itinerary: t.itinerary,
    post: t.post ? { id: t.post.id, status: t.post.status, deadline: t.post.deadline, bidCount: t.post._count.bids } : null,
    totalTravelMin: t.stops.reduce((sum, s, i) => sum + (i < t.stops.length - 1 ? (s.legDurationMin ?? 0) : 0), 0),
    stops: t.stops.map((s, i) => ({
      id: s.id,
      position: s.position,
      nights: s.nights,
      modeToNext: s.modeToNext,
      leg:
        i < t.stops.length - 1 && s.legDistanceKm != null
          ? { distanceKm: s.legDistanceKm, durationMin: s.legDurationMin, source: s.legSource }
          : null,
      location: s.location,
    })),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legs: LegsService,
  ) {}

  async list(userId: string, status?: 'DRAFT' | 'ARCHIVED') {
    // A booked trip whose last day has passed is now a completed trip.
    await this.prisma.trip.updateMany({ where: { userId, status: 'BOOKED', post: { is: { endDate: { lt: new Date(Date.now() - 86_400_000) } } } }, data: { status: 'COMPLETED' } });
    const trips = await this.prisma.trip.findMany({
      where: { userId, status: status ?? { in: [...ACTIVE_STATUSES] } },
      include: TRIP_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map(toTripDto);
  }

  async get(userId: string, id: string) {
    return toTripDto(await this.load(userId, id));
  }

  async create(userId: string, dto: CreateTripDto) {
    let stops = dto.stops ?? [];
    let title = dto.title;
    let itineraryId: string | undefined;

    if (dto.itinerarySlug) {
      const it = await this.prisma.itinerary.findUnique({
        where: { slug: dto.itinerarySlug },
        include: { stops: { orderBy: { position: 'asc' } } },
      });
      if (!it) throw new NotFoundException('Itinerary not found');
      itineraryId = it.id;
      title ??= it.title;
      if (!dto.stops) {
        stops = it.stops.map((s) => ({ locationId: s.locationId, nights: s.nights, modeToNext: s.modeToNext }));
      }
    }

    const trip = await this.prisma.trip.create({
      data: {
        userId,
        title: title ?? 'My Sri Lanka trip',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        travelers: dto.travelers ?? 2,
        budget: { ...DEFAULT_BUDGET, ...dto.budget },
        itineraryId,
      },
    });
    if (stops.length) await this.writeStops(trip.id, stops);
    return this.get(userId, trip.id);
  }

  async update(userId: string, id: string, dto: UpdateTripDto) {
    const trip = await this.load(userId, id);
    // Once posted or booked, a trip is a commitment between people: only the name can change.
    if (!['DRAFT', 'ARCHIVED'].includes(trip.status)) {
      const { title, ...others } = dto;
      if (Object.values(others).some((v) => v !== undefined)) throw new ConflictException('This trip is posted or booked, so its plan can no longer be edited');
      if (title !== undefined) await this.prisma.trip.update({ where: { id }, data: { title } });
      return this.get(userId, id);
    }
    await this.prisma.trip.update({
      where: { id },
      data: {
        title: dto.title,
        travelers: dto.travelers,
        status: dto.status,
        startDate: dto.startDate === undefined ? undefined : dto.startDate ? new Date(dto.startDate) : null,
        budget: dto.budget ? { ...settingsOf(trip.budget), ...dto.budget } : undefined,
      },
    });
    return this.get(userId, id);
  }

  async setStops(userId: string, id: string, stops: StopInput[]) {
    const trip = await this.load(userId, id);
    if (trip.status !== 'DRAFT') throw new ConflictException('This trip is posted or booked, so its stops can no longer be edited');
    await this.writeStops(id, stops);
    await this.prisma.trip.update({ where: { id }, data: { updatedAt: new Date() } });
    return this.get(userId, id);
  }

  async duplicate(userId: string, id: string) {
    const src = await this.load(userId, id);
    return this.create(userId, {
      title: `${src.title} (copy)`.slice(0, 80),
      travelers: src.travelers,
      budget: settingsOf(src.budget),
      stops: src.stops.map((s) => ({ locationId: s.locationId, nights: s.nights, modeToNext: s.modeToNext })),
    });
  }

  async remove(userId: string, id: string) {
    const trip = await this.load(userId, id);
    if (!['DRAFT', 'ARCHIVED'].includes(trip.status)) throw new ConflictException('A posted or booked trip cannot be deleted');
    await this.prisma.trip.delete({ where: { id } });
  }

  /** Other users' trips are indistinguishable from missing ones. */
  private async load(userId: string, id: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id, userId }, include: TRIP_INCLUDE });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private async writeStops(tripId: string, stops: StopInput[]) {
    const ids = [...new Set(stops.map((s) => s.locationId))];
    const locations = await this.prisma.location.findMany({ where: { id: { in: ids } }, select: { id: true, lat: true, lng: true, region: true } });
    const byId = new Map(locations.map((l) => [l.id, l]));
    if (byId.size !== ids.length) throw new BadRequestException('One or more places no longer exist');

    const legs = await Promise.all(
      stops.map((s, i) => {
        const next = stops[i + 1];
        return next ? this.legs.leg(byId.get(s.locationId)!, byId.get(next.locationId)!, s.modeToNext) : null;
      }),
    );

    await this.prisma.$transaction([
      this.prisma.tripStop.deleteMany({ where: { tripId } }),
      this.prisma.tripStop.createMany({
        data: stops.map((s, position) => ({
          tripId,
          position,
          locationId: s.locationId,
          nights: s.nights,
          modeToNext: s.modeToNext as TransportMode,
          legDistanceKm: legs[position]?.distanceKm ?? null,
          legDurationMin: legs[position]?.durationMin ?? null,
          legSource: legs[position]?.source ?? null,
        })),
      }),
    ]);
  }
}
