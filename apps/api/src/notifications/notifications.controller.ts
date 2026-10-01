import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

class MarkReadDto {
  /** Omit to mark everything read. */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) ids?: string[];
}

@Controller('notifications')
@Authenticated()
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 40 }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return { unread, items };
  }

  /** Cheap badge counts for the header; polled every 30s. */
  @Get('summary')
  async summary(@CurrentUser() user: SessionUser) {
    const [unread, rows] = await Promise.all([
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      // Messages from the other person that this user has not opened yet, across all threads.
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n
        FROM "Message" m
        JOIN "Conversation" c ON c.id = m."conversationId"
        JOIN "ProviderProfile" p ON p.id = c."providerId"
        WHERE m."senderId" <> ${user.id}
          AND (
            (c."travellerId" = ${user.id} AND (c."travellerReadAt" IS NULL OR m."createdAt" > c."travellerReadAt"))
            OR (p."userId" = ${user.id} AND (c."providerReadAt" IS NULL OR m."createdAt" > c."providerReadAt"))
          )`,
    ]);
    return { unread, messages: rows[0]?.n ?? 0 };
  }

  @Post('read')
  @HttpCode(204)
  async read(@CurrentUser() user: SessionUser, @Body() dto: MarkReadDto) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(dto.ids ? { id: { in: dto.ids } } : {}) },
      data: { readAt: new Date() },
    });
  }
}
