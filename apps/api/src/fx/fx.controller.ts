import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('fx')
export class FxController {
  constructor(private readonly prisma: PrismaService) {}

  /** Units per USD for every supported display currency. */
  @Get()
  async rates() {
    const rows = await this.prisma.fxRate.findMany();
    const updatedAt = rows.reduce<Date | null>((max, r) => (!max || r.updatedAt > max ? r.updatedAt : max), null);
    return { base: 'USD', rates: Object.fromEntries(rows.map((r) => [r.currency, r.perUsd])), updatedAt };
  }
}
