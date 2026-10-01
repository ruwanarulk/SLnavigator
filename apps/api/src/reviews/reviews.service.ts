import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ReviewDirection } from '@prisma/client';
import { REVIEW_CLOSES_AFTER_DAYS, REVIEW_CRITERIA, REVIEW_OPENS_AFTER_DAYS, REVIEW_REVEAL_AFTER_DAYS } from '@sln/core';
import { NotificationsService } from '../notifications/notifications.service';
import { shortName } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;

/** From the end of the trip's last day: the window opens, the pair is revealed, and submissions close. */
export function reviewWindow(endDate: Date) {
  const opensAt = new Date(endDate.getTime() + DAY + REVIEW_OPENS_AFTER_DAYS * DAY);
  return {
    opensAt,
    revealAt: new Date(opensAt.getTime() + REVIEW_REVEAL_AFTER_DAYS * DAY),
    closesAt: new Date(opensAt.getTime() + REVIEW_CLOSES_AFTER_DAYS * DAY),
  };
}

export interface ReviewInput {
  scores: Record<string, number>;
  recommend: boolean;
  text: string;
}

type ReviewRow = { id: string; direction: ReviewDirection; scores: unknown; overall: number; recommend: boolean; text: string; createdAt: Date };

const dto = (r: ReviewRow) => ({ id: r.id, scores: r.scores as Record<string, number>, overall: r.overall, recommend: r.recommend, text: r.text, createdAt: r.createdAt });
const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async load(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { select: { title: true, post: { select: { startDate: true, endDate: true } } } },
        provider: { select: { id: true, userId: true, displayName: true } },
        reviews: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const viewer: 'TRAVELLER' | 'PROVIDER' | null = booking.travellerId === userId ? 'TRAVELLER' : booking.provider.userId === userId ? 'PROVIDER' : null;
    if (!viewer) throw new NotFoundException('Booking not found');
    return { booking, viewer };
  }

  /** What the review screen needs: when it opens, what you wrote, and what the other side wrote once revealed. */
  async state(userId: string, bookingId: string) {
    const { booking, viewer } = await this.load(userId, bookingId);
    const direction: ReviewDirection = viewer === 'TRAVELLER' ? 'TRAVELLER_TO_PROVIDER' : 'PROVIDER_TO_TRAVELLER';
    const endDate = booking.trip.post?.endDate;
    const now = Date.now();
    const w = endDate ? reviewWindow(endDate) : null;
    const mine = booking.reviews.find((r) => r.direction === direction) ?? null;
    const theirs = booking.reviews.find((r) => r.direction !== direction) ?? null;
    const revealed = !!w && (!!(mine && theirs) || now >= w.revealAt.getTime());

    let phase: 'UNAVAILABLE' | 'NOT_YET' | 'OPEN' | 'CLOSED' | 'DONE';
    if (booking.status !== 'CONFIRMED' || !w) phase = 'UNAVAILABLE';
    else if (mine) phase = 'DONE';
    else if (now < w.opensAt.getTime()) phase = 'NOT_YET';
    else if (now > w.closesAt.getTime()) phase = 'CLOSED';
    else phase = 'OPEN';

    return {
      direction,
      phase,
      opensAt: w?.opensAt ?? null,
      revealAt: w?.revealAt ?? null,
      closesAt: w?.closesAt ?? null,
      criteria: REVIEW_CRITERIA[direction],
      counterpart: viewer === 'TRAVELLER' ? booking.provider.displayName : shortName((await this.prisma.user.findUniqueOrThrow({ where: { id: booking.travellerId }, select: { name: true } })).name),
      mine: mine ? dto(mine) : null,
      // Travellers never see a provider's private rating of them; providers see the traveller's review once revealed.
      theirs: viewer === 'PROVIDER' && revealed && theirs ? dto(theirs) : null,
      revealed,
      awaitingOther: !!mine && !revealed,
    };
  }

  async submit(userId: string, bookingId: string, input: ReviewInput) {
    const { booking, viewer } = await this.load(userId, bookingId);
    const direction: ReviewDirection = viewer === 'TRAVELLER' ? 'TRAVELLER_TO_PROVIDER' : 'PROVIDER_TO_TRAVELLER';
    const s = await this.state(userId, bookingId);
    if (s.phase === 'DONE') throw new ConflictException('You have already reviewed this trip');
    if (s.phase === 'UNAVAILABLE') throw new BadRequestException('Only completed bookings can be reviewed');
    if (s.phase === 'NOT_YET') throw new BadRequestException(`Reviews open on ${s.opensAt!.toISOString().slice(0, 10)}, a few days after your trip, so they reflect the whole experience.`);
    if (s.phase === 'CLOSED') throw new BadRequestException('The review window for this trip has closed');

    const criteria = REVIEW_CRITERIA[direction];
    const given = Object.keys(input.scores);
    if (given.length !== criteria.length || !criteria.every((c) => Number.isInteger(input.scores[c.id]) && input.scores[c.id] >= 1 && input.scores[c.id] <= 5)) {
      throw new BadRequestException(`Score every item from 1 to 5: ${criteria.map((c) => c.label).join(', ')}`);
    }
    const overall = round1(criteria.reduce((sum, c) => sum + input.scores[c.id], 0) / criteria.length);
    await this.prisma.review.create({
      data: { bookingId, direction, raterId: userId, providerId: booking.providerId, scores: input.scores, overall, recommend: input.recommend, text: input.text.trim() },
    });
    await this.refreshProviderRating(booking.providerId);
    return this.state(userId, bookingId);
  }

  // ---------- roll-ups ----------

  /** A review is public once the other side has written theirs, or the reveal deadline has passed. */
  private isRevealed(booking: { reviews: { direction: ReviewDirection }[]; trip: { post: { endDate: Date } | null } }, now = Date.now()) {
    const both = new Set(booking.reviews.map((r) => r.direction)).size === 2;
    return both || (!!booking.trip.post && now >= reviewWindow(booking.trip.post.endDate).revealAt.getTime());
  }

  private async revealed(direction: ReviewDirection, where: { providerId?: string; travellerId?: string }) {
    const rows = await this.prisma.review.findMany({
      where: { direction, ...(where.providerId ? { providerId: where.providerId } : {}), booking: { status: 'CONFIRMED', ...(where.travellerId ? { travellerId: where.travellerId } : {}) } },
      include: { booking: { select: { travellerId: true, reviews: { select: { direction: true } }, trip: { select: { title: true, post: { select: { startDate: true, endDate: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.filter((r) => this.isRevealed(r.booking));
  }

  /** Only real providers get a rating computed from reviews; seeded demo profiles keep their sample numbers. */
  async refreshProviderRating(providerId: string) {
    const provider = await this.prisma.providerProfile.findUnique({ where: { id: providerId }, select: { userId: true } });
    if (!provider?.userId) return;
    const rows = await this.revealed('TRAVELLER_TO_PROVIDER', { providerId });
    const rating = rows.length ? round1(rows.reduce((s, r) => s + r.overall, 0) / rows.length) : 0;
    await this.prisma.providerProfile.update({ where: { id: providerId }, data: { rating, reviewCount: rows.length } });
  }

  async publicReviews(slug: string) {
    const provider = await this.prisma.providerProfile.findFirst({ where: { slug, verificationStatus: 'APPROVED' }, select: { id: true } });
    if (!provider) throw new NotFoundException('Provider not found');
    await this.refreshProviderRating(provider.id);
    const rows = await this.revealed('TRAVELLER_TO_PROVIDER', { providerId: provider.id });
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.booking.travellerId) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
    const criteria = REVIEW_CRITERIA.TRAVELLER_TO_PROVIDER;
    const breakdown = Object.fromEntries(criteria.map((c) => [c.id, rows.length ? round1(rows.reduce((s, r) => s + ((r.scores as Record<string, number>)[c.id] ?? 0), 0) / rows.length) : 0]));
    return {
      count: rows.length,
      rating: rows.length ? round1(rows.reduce((s, r) => s + r.overall, 0) / rows.length) : 0,
      recommendPct: rows.length ? Math.round((rows.filter((r) => r.recommend).length / rows.length) * 100) : 0,
      breakdown,
      criteria,
      items: rows.slice(0, 50).map((r) => ({
        id: r.id,
        overall: r.overall,
        scores: r.scores as Record<string, number>,
        recommend: r.recommend,
        text: r.text,
        travellerName: shortName(names.get(r.booking.travellerId) ?? 'Traveller'),
        tripTitle: r.booking.trip.title,
        month: r.booking.trip.post?.startDate ?? r.createdAt,
        createdAt: r.createdAt,
      })),
    };
  }

  // ---------- reminders (run daily by a cron) ----------

  /** Invites both people to review once the window opens. Safe to run repeatedly. */
  async sendReminders() {
    const now = Date.now();
    const bookings = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', trip: { post: { is: { endDate: { lt: new Date(now - (1 + REVIEW_OPENS_AFTER_DAYS) * DAY), gt: new Date(now - (1 + REVIEW_OPENS_AFTER_DAYS + REVIEW_CLOSES_AFTER_DAYS) * DAY) } } } } },
      include: { reviews: { select: { direction: true } }, provider: { select: { userId: true, displayName: true } }, trip: { select: { title: true } } },
      take: 500,
    });
    let sent = 0;
    for (const b of bookings) {
      const link = `/bookings/${b.id}`;
      const targets = [
        { userId: b.travellerId, done: b.reviews.some((r) => r.direction === 'TRAVELLER_TO_PROVIDER'), body: `How did ${b.provider.displayName} do on "${b.trip.title}"? Your review helps other travellers choose.` },
        ...(b.provider.userId ? [{ userId: b.provider.userId, done: b.reviews.some((r) => r.direction === 'PROVIDER_TO_TRAVELLER'), body: `Rate your traveller for "${b.trip.title}". Only other providers see this.` }] : []),
      ];
      for (const t of targets) {
        if (t.done) continue;
        const exists = await this.prisma.notification.count({ where: { userId: t.userId, type: 'review.request', link } });
        if (exists) continue;
        await this.notifications.notify({ userId: t.userId, type: 'review.request', title: 'How was your trip?', body: t.body, link });
        sent += 1;
      }
    }
    return { checked: bookings.length, sent };
  }
}
