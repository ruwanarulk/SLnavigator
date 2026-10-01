import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { COMMISSION_PCT, shortName, youReceive } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;

const BOOKING_INCLUDE = {
  trip: {
    select: {
      id: true,
      title: true,
      stops: { orderBy: { position: 'asc' as const }, select: { nights: true, location: { select: { name: true, slug: true, source: true } } } },
      post: { select: { id: true, startDate: true, endDate: true, adults: true, children: true, notes: true, need: true } },
    },
  },
  bid: { select: { inclusions: true, pitch: true } },
  provider: { select: { id: true, slug: true, userId: true, displayName: true, type: true, city: true, phone: true, languages: true, rating: true, reviewCount: true } },
  traveller: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BookingInclude;

type BookingFull = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

export type BookingPhase = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** Where a booking is in time. Completion is derived from the dates, so no scheduled job is needed. */
export function phaseOf(b: { status: 'CONFIRMED' | 'CANCELLED' }, post: { startDate: Date; endDate: Date } | null, now = Date.now()): BookingPhase {
  if (b.status === 'CANCELLED') return 'CANCELLED';
  if (!post) return 'UPCOMING';
  if (now < post.startDate.getTime()) return 'UPCOMING';
  if (now < post.endDate.getTime() + DAY) return 'IN_PROGRESS';
  return 'COMPLETED';
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- the traveller's choices ----------

  async shortlist(userId: string, tripId: string, bidId: string, value: boolean) {
    const bid = await this.prisma.bid.findFirst({ where: { id: bidId, post: { tripId, userId, status: 'OPEN' } } });
    if (!bid || bid.status !== 'PENDING') throw new NotFoundException('Bid not found');
    await this.prisma.bid.update({ where: { id: bidId }, data: { shortlisted: value } });
    return { id: bidId, shortlisted: value };
  }

  async accept(userId: string, tripId: string, bidId: string) {
    const post = await this.prisma.tripPost.findFirst({
      where: { tripId, userId },
      include: { trip: { select: { title: true } }, bids: { include: { provider: { select: { id: true, userId: true, displayName: true } } } } },
    });
    if (!post) throw new NotFoundException('This trip has not been posted');
    if (post.status !== 'OPEN') throw new ConflictException('This request is no longer open');
    const bid = post.bids.find((b) => b.id === bidId);
    if (!bid || bid.status !== 'PENDING') throw new NotFoundException('That bid is no longer available');

    const commissionUsd = Math.round((bid.priceUsd * COMMISSION_PCT) / 100);
    const booking = await this.prisma.$transaction(async (tx) => {
      // Guards against two clicks (or two tabs) accepting different bids.
      const closed = await tx.tripPost.updateMany({ where: { id: post.id, status: 'OPEN' }, data: { status: 'CLOSED' } });
      if (closed.count !== 1) throw new ConflictException('This request has already been booked');
      await tx.bid.update({ where: { id: bid.id }, data: { status: 'ACCEPTED' } });
      await tx.bid.updateMany({ where: { postId: post.id, id: { not: bid.id }, status: 'PENDING' }, data: { status: 'REJECTED', shortlisted: false } });
      await tx.trip.update({ where: { id: tripId }, data: { status: 'BOOKED' } });
      return tx.booking.create({
        data: { tripId, postId: post.id, bidId: bid.id, travellerId: userId, providerId: bid.providerId, priceUsd: bid.priceUsd, commissionPct: COMMISSION_PCT, commissionUsd },
      });
    });

    const winner = bid.provider;
    await this.notifications.notifyMany([
      ...(winner.userId
        ? [{ userId: winner.userId, type: 'bid.accepted', title: 'You got the booking', body: `Your $${bid.priceUsd.toLocaleString('en-US')} bid for "${post.trip.title}" was accepted. Say hello and confirm the details.`, link: `/bookings/${booking.id}` }]
        : []),
      ...post.bids
        .filter((b) => b.id !== bid.id && b.status === 'PENDING' && b.provider.userId)
        .map((b) => ({ userId: b.provider.userId!, type: 'bid.rejected', title: 'Not selected this time', body: `The traveller chose another offer for "${post.trip.title}". Thanks for bidding.`, link: '/provider/bids', email: false })),
    ]);
    return { id: booking.id };
  }

  // ---------- reading ----------

  /** Both people on a booking can open it; anyone else gets a 404. */
  private async load(userId: string, id: string): Promise<{ booking: BookingFull; viewer: 'TRAVELLER' | 'PROVIDER' }> {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
    if (!booking) throw new NotFoundException('Booking not found');
    const viewer = booking.travellerId === userId ? 'TRAVELLER' : booking.provider.userId === userId ? 'PROVIDER' : null;
    if (!viewer) throw new NotFoundException('Booking not found');
    return { booking, viewer };
  }

  private async markCompleted(b: BookingFull) {
    if (phaseOf(b, b.trip.post) === 'COMPLETED') {
      await this.prisma.trip.updateMany({ where: { id: b.tripId, status: 'BOOKED' }, data: { status: 'COMPLETED' } });
    }
  }

  private dto(b: BookingFull, viewer: 'TRAVELLER' | 'PROVIDER') {
    const post = b.trip.post;
    const phase = phaseOf(b, post);
    const people = post ? post.adults + post.children : 0;
    return {
      id: b.id,
      tripId: b.tripId,
      status: b.status,
      phase,
      viewer,
      createdAt: b.createdAt,
      priceUsd: b.priceUsd,
      pricePerPersonUsd: people ? Math.round(b.priceUsd / people) : null,
      // Only the provider sees what they will receive.
      ...(viewer === 'PROVIDER' ? { youReceiveUsd: youReceive(b.priceUsd), commissionPct: b.commissionPct } : {}),
      inclusions: b.bid.inclusions,
      pitch: b.bid.pitch,
      cancellable: b.status === 'CONFIRMED' && !!post && Date.now() < post.startDate.getTime(),
      cancelledBy: b.cancelledById ? (b.cancelledById === b.travellerId ? 'TRAVELLER' : 'PROVIDER') : null,
      cancelReason: b.cancelReason,
      trip: {
        id: b.trip.id,
        title: b.trip.title,
        startDate: post?.startDate ?? null,
        endDate: post?.endDate ?? null,
        adults: post?.adults ?? 0,
        children: post?.children ?? 0,
        notes: post?.notes ?? '',
        stops: b.trip.stops.map((s) => ({ name: s.location.name, nights: s.nights, slug: s.location.source === 'CURATED' ? s.location.slug : null })),
      },
      // Contact details are revealed to each side only once the booking exists.
      provider: {
        id: b.provider.id,
        slug: b.provider.slug,
        displayName: b.provider.displayName,
        type: b.provider.type,
        city: b.provider.city,
        languages: b.provider.languages,
        rating: b.provider.rating,
        reviewCount: b.provider.reviewCount,
        phone: viewer === 'TRAVELLER' && b.status === 'CONFIRMED' ? b.provider.phone : null,
      },
      traveller: {
        name: viewer === 'PROVIDER' ? b.traveller.name : shortName(b.traveller.name),
        email: viewer === 'PROVIDER' && b.status === 'CONFIRMED' ? b.traveller.email : null,
      },
    };
  }

  async get(userId: string, id: string) {
    const { booking, viewer } = await this.load(userId, id);
    await this.markCompleted(booking);
    return this.dto(booking, viewer);
  }

  async forTrip(userId: string, tripId: string) {
    const b = await this.prisma.booking.findFirst({ where: { tripId, travellerId: userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (!b) throw new NotFoundException('This trip has no booking');
    return b;
  }

  async list(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { OR: [{ travellerId: userId }, { provider: { userId } }] },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    for (const b of rows) await this.markCompleted(b);
    return rows.map((b) => {
      const d = this.dto(b, b.travellerId === userId ? 'TRAVELLER' : 'PROVIDER');
      return {
        id: d.id,
        phase: d.phase,
        viewer: d.viewer,
        priceUsd: d.priceUsd,
        youReceiveUsd: 'youReceiveUsd' in d ? d.youReceiveUsd : undefined,
        tripTitle: d.trip.title,
        startDate: d.trip.startDate,
        endDate: d.trip.endDate,
        counterparty: d.viewer === 'TRAVELLER' ? d.provider.displayName : d.traveller.name,
      };
    });
  }

  // ---------- cancelling ----------

  async cancel(userId: string, id: string, reason: string) {
    const { booking, viewer } = await this.load(userId, id);
    const post = booking.trip.post;
    if (booking.status !== 'CONFIRMED') throw new ConflictException('This booking is already cancelled');
    if (!post || Date.now() >= post.startDate.getTime()) throw new BadRequestException('A trip that has started cannot be cancelled here. Contact support.');

    await this.prisma.$transaction([
      this.prisma.booking.update({ where: { id }, data: { status: 'CANCELLED', cancelledById: userId, cancelReason: reason.trim(), cancelledAt: new Date() } }),
      this.prisma.bid.update({ where: { id: booking.bidId }, data: { status: 'WITHDRAWN' } }),
      this.prisma.tripPost.update({ where: { id: booking.postId }, data: { status: 'WITHDRAWN' } }),
      this.prisma.trip.update({ where: { id: booking.tripId }, data: { status: 'DRAFT' } }),
    ]);

    const other = viewer === 'TRAVELLER' ? booking.provider.userId : booking.travellerId;
    if (other) {
      await this.notifications.notify({
        userId: other,
        type: 'booking.cancelled',
        title: 'A booking was cancelled',
        body: viewer === 'TRAVELLER' ? `The traveller cancelled "${booking.trip.title}". Reason: ${reason.trim()}` : `${booking.provider.displayName} cancelled "${booking.trip.title}". Reason: ${reason.trim()} You can post your trip again to receive new offers.`,
        link: viewer === 'TRAVELLER' ? '/provider/bids' : `/plan/${booking.tripId}`,
      });
    }
    return this.get(userId, id);
  }
}
