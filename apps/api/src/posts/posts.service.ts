import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ServiceNeed } from '@prisma/client';
import { tripDays } from '@sln/core';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { matchRequest } from './matching';

/** Platform commission on a completed trip, shown to providers before they bid. */
export const COMMISSION_PCT = Number(process.env.COMMISSION_PCT ?? 12);

const PROVIDER_PUBLIC = {
  id: true,
  slug: true,
  displayName: true,
  type: true,
  city: true,
  rating: true,
  reviewCount: true,
  responseTimeMin: true,
  languages: true,
  specialties: true,
  areas: true,
  yearsActive: true,
  isSample: true,
} satisfies Prisma.ProviderProfileSelect;

const POST_WITH_TRIP = {
  trip: {
    select: {
      id: true,
      title: true,
      userId: true,
      stops: { orderBy: { position: 'asc' as const }, select: { nights: true, location: { select: { id: true, name: true, region: true, slug: true } } } },
      user: { select: { name: true } },
    },
  },
  _count: { select: { bids: { where: { status: 'PENDING' as const } } } },
} satisfies Prisma.TripPostInclude;

type PostWithTrip = Prisma.TripPostGetPayload<{ include: typeof POST_WITH_TRIP }>;

/** "Sarah Miller" becomes "Sarah M." so providers never see a full name before a booking. */
export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0].toUpperCase()}.` : first;
}

export const youReceive = (priceUsd: number) => Math.round(priceUsd * (1 - COMMISSION_PCT / 100));

export interface CreatePostInput {
  startDate: string;
  adults: number;
  children: number;
  budgetMinUsd: number;
  budgetMaxUsd: number;
  need: ServiceNeed;
  interests: string[];
  languages: string[];
  notes: string;
  deadlineHours: number;
}

export interface BidInput {
  priceUsd: number;
  inclusions: string[];
  pitch: string;
  availabilityConfirmed: boolean;
}

const DAY = 86_400_000;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- traveller ----------

  async createPost(userId: string, tripId: string, input: CreatePostInput) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: { stops: { orderBy: { position: 'asc' }, include: { location: { select: { region: true } } } }, post: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'DRAFT') throw new ConflictException(trip.status === 'POSTED' ? 'This trip is already posted for bids' : 'This trip can no longer be posted');
    if (trip.stops.length < 1) throw new BadRequestException('Add at least one stop before posting');
    if (input.budgetMaxUsd < input.budgetMinUsd) throw new BadRequestException('The maximum budget must be at least the minimum');
    if (input.adults + input.children > 20) throw new BadRequestException('Groups are limited to 20 people');

    const start = new Date(`${input.startDate}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Choose a valid start date');
    if (start.getTime() < Date.now() + DAY) throw new BadRequestException('Pick a start date at least a day from now');
    const days = tripDays(trip.stops.map((s) => s.nights));
    const end = new Date(start.getTime() + (days - 1) * DAY);

    const deadline = new Date(Date.now() + input.deadlineHours * 3_600_000);
    if (deadline.getTime() >= start.getTime()) throw new BadRequestException(`Your trip starts too soon for a ${input.deadlineHours}-hour bidding window. Choose a shorter one.`);

    const data = {
      userId,
      startDate: start,
      endDate: end,
      adults: input.adults,
      children: input.children,
      budgetMinUsd: input.budgetMinUsd,
      budgetMaxUsd: input.budgetMaxUsd,
      need: input.need,
      interests: input.interests,
      languages: input.languages,
      notes: input.notes.trim(),
      deadline,
      status: 'OPEN' as const,
    };
    const post = await this.prisma.$transaction(async (tx) => {
      const saved = trip.post
        ? await tx.tripPost.update({ where: { id: trip.post.id }, data })
        : await tx.tripPost.create({ data: { ...data, tripId } });
      // A re-post starts a fresh round: older bids are cleared out.
      if (trip.post) await tx.bid.updateMany({ where: { postId: saved.id, status: 'PENDING' }, data: { status: 'WITHDRAWN' } });
      await tx.trip.update({ where: { id: tripId }, data: { status: 'POSTED', startDate: start, travelers: input.adults + input.children } });
      return saved;
    });

    await this.notifyMatching(post.id, trip.title, [...new Set(trip.stops.map((s) => s.location.region))]);
    return this.ownerPost(userId, tripId);
  }

  async withdraw(userId: string, tripId: string) {
    const post = await this.prisma.tripPost.findFirst({ where: { tripId, userId }, include: { trip: { select: { title: true } }, bids: { where: { status: 'PENDING' }, include: { provider: { select: { userId: true } } } } } });
    if (!post) throw new NotFoundException('This trip has not been posted');
    if (post.status !== 'OPEN') throw new ConflictException('This request is no longer open');
    await this.prisma.$transaction([
      this.prisma.tripPost.update({ where: { id: post.id }, data: { status: 'WITHDRAWN' } }),
      this.prisma.bid.updateMany({ where: { postId: post.id, status: 'PENDING' }, data: { status: 'WITHDRAWN' } }),
      this.prisma.trip.update({ where: { id: tripId }, data: { status: 'DRAFT' } }),
    ]);
    await this.notifications.notifyMany(
      post.bids.filter((b) => b.provider.userId).map((b) => ({
        userId: b.provider.userId!,
        type: 'request.withdrawn',
        title: 'A trip request was withdrawn',
        body: `The traveller withdrew "${post.trip.title}". Your bid has been cancelled.`,
        link: '/provider/bids',
        email: false,
      })),
    );
  }

  /** The traveller's view: their request and every bid on it. */
  async ownerPost(userId: string, tripId: string) {
    const post = await this.prisma.tripPost.findFirst({
      where: { tripId, userId },
      include: { bids: { where: { status: { not: 'WITHDRAWN' } }, include: { provider: { select: PROVIDER_PUBLIC } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!post) throw new NotFoundException('This trip has not been posted');
    const { bids, ...rest } = post;
    return {
      ...rest,
      biddingOpen: post.status === 'OPEN' && post.deadline.getTime() > Date.now(),
      bids: bids.map((b) => ({
        id: b.id,
        status: b.status,
        priceUsd: b.priceUsd,
        inclusions: b.inclusions,
        pitch: b.pitch,
        availabilityConfirmed: b.availabilityConfirmed,
        shortlisted: b.shortlisted,
        createdAt: b.createdAt,
        provider: b.provider,
      })),
    };
  }

  // ---------- providers ----------

  /** Only verified providers can see requests or bid. */
  async approvedProvider(userId: string) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException('No provider profile for this account');
    if (p.verificationStatus !== 'APPROVED') throw new ForbiddenException('You can bid once your profile is verified');
    return p;
  }

  private requestDto(post: PostWithTrip, provider: { type: Parameters<typeof matchRequest>[0]['type']; areas: string[]; languages: string[]; specialties: string[] }, myBid: BidRow | null) {
    const regions = [...new Set(post.trip.stops.map((s) => s.location.region))];
    const m = matchRequest(provider, { need: post.need, regions, interests: post.interests, languages: post.languages });
    return {
      id: post.id,
      tripId: post.tripId,
      title: post.trip.title,
      travellerName: shortName(post.trip.user.name),
      startDate: post.startDate,
      endDate: post.endDate,
      days: Math.round((post.endDate.getTime() - post.startDate.getTime()) / DAY) + 1,
      adults: post.adults,
      children: post.children,
      budgetMinUsd: post.budgetMinUsd,
      budgetMaxUsd: post.budgetMaxUsd,
      need: post.need,
      interests: post.interests,
      languages: post.languages,
      notes: post.notes,
      deadline: post.deadline,
      stops: post.trip.stops.map((s) => ({ name: s.location.name, nights: s.nights, region: s.location.region })),
      bidCount: post._count.bids,
      matches: m.matches,
      matchTags: m.tags,
      commissionPct: COMMISSION_PCT,
      myBid: myBid ? this.bidDto(myBid) : null,
    };
  }

  private bidDto(b: BidRow) {
    return {
      id: b.id,
      postId: b.postId,
      status: b.status,
      priceUsd: b.priceUsd,
      youReceiveUsd: youReceive(b.priceUsd),
      inclusions: b.inclusions,
      pitch: b.pitch,
      availabilityConfirmed: b.availabilityConfirmed,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  async requests(userId: string, scope: 'matching' | 'all') {
    const provider = await this.approvedProvider(userId);
    const posts = await this.prisma.tripPost.findMany({
      where: { status: 'OPEN', deadline: { gt: new Date() } },
      include: { ...POST_WITH_TRIP, bids: { where: { providerId: provider.id } } },
      orderBy: { deadline: 'asc' },
      take: 200,
    });
    const rows = posts.map(({ bids, ...post }) => this.requestDto(post, provider, bids[0] ?? null));
    return { matching: rows.filter((r) => r.matches).length, all: rows.length, items: scope === 'matching' ? rows.filter((r) => r.matches) : rows };
  }

  async request(userId: string, postId: string) {
    const provider = await this.approvedProvider(userId);
    const post = await this.prisma.tripPost.findUnique({ where: { id: postId }, include: { ...POST_WITH_TRIP, bids: { where: { providerId: provider.id } } } });
    // Providers only see open requests, or ones they already bid on.
    if (!post || (post.status !== 'OPEN' && post.bids.length === 0)) throw new NotFoundException('Request not found');
    const { bids, ...rest } = post;
    return this.requestDto(rest, provider, bids[0] ?? null);
  }

  async placeBid(userId: string, postId: string, input: BidInput) {
    const provider = await this.approvedProvider(userId);
    if (!input.availabilityConfirmed) throw new BadRequestException('Confirm that you are available on these dates');
    const post = await this.prisma.tripPost.findUnique({ where: { id: postId }, include: { trip: { select: { userId: true, title: true } } } });
    if (!post || post.status !== 'OPEN') throw new NotFoundException('This request is no longer open');
    if (post.deadline.getTime() <= Date.now()) throw new ConflictException('Bidding on this request has closed');
    if (post.trip.userId === userId) throw new ForbiddenException();

    const existing = await this.prisma.bid.findUnique({ where: { postId_providerId: { postId, providerId: provider.id } } });
    if (existing?.status === 'ACCEPTED' || existing?.status === 'REJECTED') throw new ConflictException('This bid is final');
    const data = { priceUsd: input.priceUsd, inclusions: input.inclusions, pitch: input.pitch.trim(), availabilityConfirmed: true, status: 'PENDING' as const, shortlisted: existing?.shortlisted ?? false };
    const bid = await this.prisma.bid.upsert({
      where: { postId_providerId: { postId, providerId: provider.id } },
      update: data,
      create: { ...data, postId, providerId: provider.id },
    });
    const revised = !!existing && existing.status === 'PENDING';
    await this.notifications.notify({
      userId: post.userId,
      type: revised ? 'bid.updated' : 'bid.new',
      title: revised ? `${provider.displayName} updated their bid` : `New bid on ${post.trip.title}`,
      body: `${provider.displayName} bid $${input.priceUsd.toLocaleString('en-US')} for your trip.`,
      link: `/trips/${post.tripId}/bids`,
    });
    return this.bidDto(bid);
  }

  async withdrawBid(userId: string, postId: string) {
    const provider = await this.approvedProvider(userId);
    const bid = await this.prisma.bid.findUnique({ where: { postId_providerId: { postId, providerId: provider.id } } });
    if (!bid || bid.status !== 'PENDING') throw new NotFoundException('No active bid to withdraw');
    await this.prisma.bid.update({ where: { id: bid.id }, data: { status: 'WITHDRAWN', shortlisted: false } });
  }

  async myBids(userId: string) {
    const provider = await this.approvedProvider(userId);
    const bids = await this.prisma.bid.findMany({
      where: { providerId: provider.id },
      include: { post: { include: { trip: { select: { title: true } } } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return bids.map((b) => ({
      ...this.bidDto(b),
      tripTitle: b.post.trip.title,
      startDate: b.post.startDate,
      endDate: b.post.endDate,
      deadline: b.post.deadline,
      postStatus: b.post.status,
      tripId: b.post.tripId,
    }));
  }

  // ---------- notifications ----------

  private async notifyMatching(postId: string, title: string, regions: string[]) {
    const post = await this.prisma.tripPost.findUniqueOrThrow({ where: { id: postId } });
    const providers = await this.prisma.providerProfile.findMany({
      where: { verificationStatus: 'APPROVED', userId: { not: null } },
      select: { userId: true, type: true, areas: true, languages: true, specialties: true },
      take: 300,
    });
    const people = post.adults + post.children;
    const targets = providers.filter((p) => matchRequest(p, { need: post.need, regions, interests: post.interests, languages: post.languages }).matches);
    await this.notifications.notifyMany(
      targets.map((p) => ({
        userId: p.userId!,
        type: 'request.new',
        title: `New trip request: ${title}`,
        body: `${people} ${people === 1 ? 'traveller' : 'travellers'}, budget $${post.budgetMinUsd.toLocaleString('en-US')}–$${post.budgetMaxUsd.toLocaleString('en-US')}. Bidding closes ${post.deadline.toUTCString().slice(0, 22)} UTC.`,
        link: `/provider/requests?open=${post.id}`,
      })),
    );
  }
}

type BidRow = Prisma.BidGetPayload<object>;
