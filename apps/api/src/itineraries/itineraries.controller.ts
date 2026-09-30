import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { LOCATION_CARD } from '../common/selects';
import { PrismaService } from '../prisma/prisma.service';

const WITH_STOPS = {
  stops: { orderBy: { position: 'asc' as const }, include: { location: { select: LOCATION_CARD } } },
};

@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.itinerary.findMany({
      where: { published: true },
      include: WITH_STOPS,
      orderBy: { createdAt: 'asc' },
    });
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const itinerary = await this.prisma.itinerary.findFirst({ where: { slug, published: true }, include: WITH_STOPS });
    if (!itinerary) throw new NotFoundException('Itinerary not found');
    return itinerary;
  }
}
