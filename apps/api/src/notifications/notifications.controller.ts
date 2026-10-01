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
    const unread = await this.prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return { unread };
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
