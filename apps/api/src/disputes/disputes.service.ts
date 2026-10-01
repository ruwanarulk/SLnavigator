import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DisputeReason } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async participant(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { select: { title: true } }, provider: { select: { userId: true, displayName: true } }, traveller: { select: { name: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const role: 'TRAVELLER' | 'PROVIDER' | null = booking.travellerId === userId ? 'TRAVELLER' : booking.provider.userId === userId ? 'PROVIDER' : null;
    if (!role) throw new NotFoundException('Booking not found');
    return { booking, role };
  }

  /** Both people on a booking see its disputes; the details stay with whoever wrote them. */
  async list(userId: string, bookingId: string) {
    const { role } = await this.participant(userId, bookingId);
    const rows = await this.prisma.dispute.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } });
    return rows.map((d) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      createdAt: d.createdAt,
      raisedByYou: d.raisedById === userId,
      raisedBy: d.raisedById === userId ? role : role === 'TRAVELLER' ? 'PROVIDER' : 'TRAVELLER',
      details: d.raisedById === userId ? d.details : null,
      resolution: d.resolution,
      resolvedAt: d.resolvedAt,
    }));
  }

  async raise(userId: string, bookingId: string, input: { reason: DisputeReason; details: string }) {
    const { booking, role } = await this.participant(userId, bookingId);
    const details = input.details.trim();
    if (details.length < 10) throw new BadRequestException('Please describe what happened in a sentence or two');
    const open = await this.prisma.dispute.count({ where: { bookingId, raisedById: userId, status: 'OPEN' } });
    if (open) throw new ConflictException('You already have an open report on this booking. Our team is looking at it.');

    const dispute = await this.prisma.dispute.create({ data: { bookingId, raisedById: userId, reason: input.reason, details } });
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const otherUser = role === 'TRAVELLER' ? booking.provider.userId : booking.travellerId;
    await this.notifications.notifyMany([
      ...admins.map((a) => ({
        userId: a.id,
        type: 'dispute.new',
        title: 'A problem was reported',
        body: `${role === 'TRAVELLER' ? booking.traveller.name : booking.provider.displayName} reported a problem on "${booking.trip.title}" (${input.reason.toLowerCase().replace('_', ' ')}).`,
        link: '/admin',
      })),
      ...(otherUser
        ? [{ userId: otherUser, type: 'dispute.reported', title: 'A problem was reported on a booking', body: `The ${role === 'TRAVELLER' ? 'traveller' : 'provider'} reported a problem on "${booking.trip.title}". Our team will review it and may get in touch.`, link: `/bookings/${bookingId}`, email: false }]
        : []),
    ]);
    return { id: dispute.id };
  }

  // ---------- admin ----------

  async adminList(status: 'OPEN' | 'RESOLVED') {
    const rows = await this.prisma.dispute.findMany({
      where: { status },
      orderBy: { createdAt: status === 'OPEN' ? 'asc' : 'desc' },
      include: {
        booking: {
          include: {
            trip: { select: { title: true, post: { select: { startDate: true, endDate: true } } } },
            traveller: { select: { name: true, email: true } },
            provider: { select: { displayName: true, phone: true, user: { select: { email: true } } } },
          },
        },
      },
      take: 100,
    });
    return rows.map((d) => ({
      id: d.id,
      bookingId: d.bookingId,
      status: d.status,
      reason: d.reason,
      details: d.details,
      createdAt: d.createdAt,
      raisedBy: d.raisedById === d.booking.travellerId ? 'TRAVELLER' : 'PROVIDER',
      resolution: d.resolution,
      resolvedAt: d.resolvedAt,
      bookingStatus: d.booking.status,
      tripTitle: d.booking.trip.title,
      startDate: d.booking.trip.post?.startDate ?? null,
      endDate: d.booking.trip.post?.endDate ?? null,
      priceUsd: d.booking.priceUsd,
      traveller: { name: d.booking.traveller.name, email: d.booking.traveller.email },
      provider: { name: d.booking.provider.displayName, phone: d.booking.provider.phone, email: d.booking.provider.user?.email ?? null },
    }));
  }

  async resolve(adminId: string, id: string, resolution: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: { booking: { include: { trip: { select: { title: true } }, provider: { select: { userId: true } } } } },
    });
    if (!d) throw new NotFoundException();
    if (d.status === 'RESOLVED') throw new ConflictException('Already resolved');
    const text = resolution.trim();
    if (text.length < 10) throw new BadRequestException('Write what was decided, so both people can see it');
    await this.prisma.$transaction([
      this.prisma.dispute.update({ where: { id }, data: { status: 'RESOLVED', resolution: text, resolvedById: adminId, resolvedAt: new Date() } }),
      this.prisma.auditLog.create({ data: { actorId: adminId, action: 'dispute.resolved', targetType: 'Dispute', targetId: id, notes: text } }),
    ]);
    const title = d.booking.trip.title;
    await this.notifications.notifyMany(
      [d.booking.travellerId, d.booking.provider.userId].filter((u): u is string => !!u).map((userId) => ({
        userId,
        type: 'dispute.resolved',
        title: 'A reported problem was resolved',
        body: `About "${title}": ${text}`,
        link: `/bookings/${d.bookingId}`,
      })),
    );
    return { id };
  }
}
