import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { shortName } from '../posts/posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CONTACT_BLOCKED_MESSAGE, containsContactDetails } from './contact-filter';

const CONVERSATION_INCLUDE = {
  trip: { select: { id: true, title: true, userId: true, user: { select: { name: true } }, post: { select: { id: true, status: true, deadline: true } } } },
  provider: { select: { id: true, userId: true, slug: true, displayName: true, type: true } },
} satisfies Prisma.ConversationInclude;

type Conv = Prisma.ConversationGetPayload<{ include: typeof CONVERSATION_INCLUDE }>;
type Viewer = 'TRAVELLER' | 'PROVIDER';

const MAX_BODY = 2000;
const PAGE = 200;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- starting a conversation ----------

  /** Gets or creates the thread for a trip and provider. Travellers name the provider; providers are themselves. */
  async open(userId: string, input: { tripId: string; providerId?: string }) {
    const trip = await this.prisma.trip.findUnique({ where: { id: input.tripId }, include: { post: { include: { bids: { select: { providerId: true, status: true } } } } } });
    if (!trip || !trip.post) throw new NotFoundException('Trip not found');
    const post = trip.post;

    let providerId: string;
    if (trip.userId === userId) {
      if (!input.providerId) throw new BadRequestException('Choose who to message');
      // A guide who asked a question first has already started the thread; the traveller can always reply.
      const existing = await this.prisma.conversation.findUnique({ where: { tripId_providerId: { tripId: trip.id, providerId: input.providerId } }, select: { id: true } });
      if (existing) return existing;
      const bid = post.bids.find((b) => b.providerId === input.providerId && b.status !== 'WITHDRAWN');
      const booked = await this.prisma.booking.count({ where: { tripId: trip.id, providerId: input.providerId } });
      if (!bid && !booked) throw new ForbiddenException('You can message providers who have bid on your trip');
      providerId = input.providerId;
    } else {
      const provider = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!provider || provider.verificationStatus !== 'APPROVED') throw new ForbiddenException('Only verified providers can ask questions');
      const open = post.status === 'OPEN' && post.deadline.getTime() > Date.now();
      const involved = post.bids.some((b) => b.providerId === provider.id) || (await this.prisma.booking.count({ where: { tripId: trip.id, providerId: provider.id } })) > 0;
      if (!open && !involved) throw new NotFoundException('Trip not found');
      providerId = provider.id;
    }
    const conv = await this.prisma.conversation.upsert({
      where: { tripId_providerId: { tripId: trip.id, providerId } },
      update: {},
      create: { tripId: trip.id, providerId, travellerId: trip.userId },
      select: { id: true },
    });
    return conv;
  }

  // ---------- reading ----------

  private async load(userId: string, id: string): Promise<{ conv: Conv; viewer: Viewer }> {
    const conv = await this.prisma.conversation.findUnique({ where: { id }, include: CONVERSATION_INCLUDE });
    if (!conv) throw new NotFoundException('Conversation not found');
    const viewer: Viewer | null = conv.travellerId === userId ? 'TRAVELLER' : conv.provider.userId === userId ? 'PROVIDER' : null;
    if (!viewer) throw new NotFoundException('Conversation not found');
    return { conv, viewer };
  }

  private async confirmedBooking(conv: Pick<Conv, 'tripId' | 'providerId'>) {
    return this.prisma.booking.findFirst({ where: { tripId: conv.tripId, providerId: conv.providerId, status: 'CONFIRMED' }, select: { id: true } });
  }

  /** Threads stay open while bids are open, and after booking (for planning and afterwards). */
  private canSend(conv: Conv, booked: boolean) {
    return booked || conv.trip.post?.status === 'OPEN';
  }

  private header(conv: Conv, viewer: Viewer, bookingId: string | null, canSend: boolean) {
    return {
      id: conv.id,
      tripId: conv.tripId,
      tripTitle: conv.trip.title,
      viewer,
      counterparty:
        viewer === 'TRAVELLER'
          ? { name: conv.provider.displayName, kind: 'PROVIDER' as const, slug: conv.provider.slug }
          : // Providers see a first name and initial until the booking exists.
            { name: bookingId ? conv.trip.user.name : shortName(conv.trip.user.name), kind: 'TRAVELLER' as const, slug: null },
      bookingId,
      canSend,
      contactAllowed: !!bookingId,
    };
  }

  private readField(viewer: Viewer) {
    return viewer === 'TRAVELLER' ? 'travellerReadAt' : 'providerReadAt';
  }

  async thread(userId: string, id: string, after?: string) {
    const { conv, viewer } = await this.load(userId, id);
    const afterDate = after ? new Date(after) : null;
    const messages = await this.prisma.message.findMany({
      where: { conversationId: id, ...(afterDate && !Number.isNaN(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {}) },
      orderBy: { createdAt: after ? 'asc' : 'desc' },
      take: PAGE,
    });
    if (!after) messages.reverse();
    await this.prisma.conversation.update({ where: { id }, data: { [this.readField(viewer)]: new Date() } });
    const booking = await this.confirmedBooking(conv);
    return {
      conversation: this.header(conv, viewer, booking?.id ?? null, this.canSend(conv, !!booking)),
      messages: messages.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, mine: m.senderId === userId })),
    };
  }

  async list(userId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { OR: [{ travellerId: userId }, { provider: { userId } }] },
      include: { ...CONVERSATION_INCLUDE, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
    return Promise.all(
      convs.map(async (c) => {
        const viewer: Viewer = c.travellerId === userId ? 'TRAVELLER' : 'PROVIDER';
        const readAt = viewer === 'TRAVELLER' ? c.travellerReadAt : c.providerReadAt;
        const [unread, booking] = await Promise.all([
          this.prisma.message.count({ where: { conversationId: c.id, senderId: { not: userId }, ...(readAt ? { createdAt: { gt: readAt } } : {}) } }),
          this.confirmedBooking(c),
        ]);
        const last = c.messages[0];
        return {
          ...this.header(c, viewer, booking?.id ?? null, this.canSend(c, !!booking)),
          unread,
          lastMessageAt: c.lastMessageAt,
          lastMessage: last ? { body: last.body.slice(0, 140), mine: last.senderId === userId, at: last.createdAt } : null,
        };
      }),
    );
  }

  // ---------- sending ----------

  async send(userId: string, id: string, rawBody: string) {
    const { conv, viewer } = await this.load(userId, id);
    const body = rawBody.trim();
    if (!body) throw new BadRequestException('Write a message first');
    if (body.length > MAX_BODY) throw new BadRequestException(`Messages are limited to ${MAX_BODY} characters`);

    const booking = await this.confirmedBooking(conv);
    if (!this.canSend(conv, !!booking)) throw new ConflictException('This conversation is closed because the request is no longer open.');
    if (!booking && containsContactDetails(body)) throw new UnprocessableEntityException(CONTACT_BLOCKED_MESSAGE);

    const recipientReadAt = viewer === 'TRAVELLER' ? conv.providerReadAt : conv.travellerReadAt;
    // First message of a burst: tell the other person once, instead of on every line.
    const alreadyUnread = await this.prisma.message.count({ where: { conversationId: id, senderId: userId, ...(recipientReadAt ? { createdAt: { gt: recipientReadAt } } : {}) } });

    const message = await this.prisma.message.create({ data: { conversationId: id, senderId: userId, body } });
    await this.prisma.conversation.update({ where: { id }, data: { lastMessageAt: message.createdAt, [this.readField(viewer)]: message.createdAt } });

    const recipientUserId = viewer === 'TRAVELLER' ? conv.provider.userId : conv.travellerId;
    if (recipientUserId && alreadyUnread === 0) {
      const senderName = viewer === 'TRAVELLER' ? shortName(conv.trip.user.name) : conv.provider.displayName;
      await this.notifications.notify({
        userId: recipientUserId,
        type: 'message.new',
        title: `New message from ${senderName}`,
        body: `About "${conv.trip.title}": ${body.slice(0, 140)}`,
        link: `/inbox/${id}`,
      });
    }
    if (viewer === 'PROVIDER') await this.refreshResponseTime(conv.providerId, conv.provider.userId!);
    return { id: message.id, body: message.body, createdAt: message.createdAt, mine: true };
  }

  /**
   * "Replies in ~1 h": the median time this provider takes to answer a traveller's
   * first message, over their last 20 conversations. Shown on bids and profiles.
   */
  private async refreshResponseTime(providerId: string, providerUserId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { providerId },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      select: { messages: { orderBy: { createdAt: 'asc' }, select: { senderId: true, createdAt: true } } },
    });
    const latencies: number[] = [];
    for (const c of convs) {
      const firstFromTraveller = c.messages.find((m) => m.senderId !== providerUserId);
      if (!firstFromTraveller) continue;
      const reply = c.messages.find((m) => m.senderId === providerUserId && m.createdAt > firstFromTraveller.createdAt);
      if (!reply) continue;
      const min = (reply.createdAt.getTime() - firstFromTraveller.createdAt.getTime()) / 60_000;
      if (min <= 7 * 24 * 60) latencies.push(min);
    }
    if (!latencies.length) return;
    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    await this.prisma.providerProfile.update({ where: { id: providerId }, data: { responseTimeMin: Math.max(1, Math.round(median)) } });
  }
}
