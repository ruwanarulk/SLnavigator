import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  /** App path the notification opens, e.g. /trips/abc/bids */
  link?: string;
  /** Also send an email (when email is configured). Default true. */
  email?: boolean;
}

const WEB_ORIGIN = () => process.env.WEB_ORIGIN ?? 'http://localhost:3000';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: EmailService,
  ) {}

  async notify(input: NotifyInput) {
    const { email = true, ...data } = input;
    await this.prisma.notification.create({ data });
    if (email && this.mail.enabled) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { email: true, name: true } });
      if (user) {
        const link = input.link ? `\n\n${WEB_ORIGIN()}${input.link}` : '';
        await this.mail.send(user.email, input.title, `Hi ${user.name.split(' ')[0]},\n\n${input.body}${link}\n\nSri Lanka Navigator`);
      }
    }
  }

  /** Fire several notifications; one failure never blocks the rest. */
  async notifyMany(inputs: NotifyInput[]) {
    await Promise.allSettled(inputs.map((i) => this.notify(i)));
  }
}
