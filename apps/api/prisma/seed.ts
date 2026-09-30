import { PrismaClient, ProviderType, TransportMode, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { LOCATIONS } from './seed-data/locations';
import { FX_RATES, ITINERARIES, SAMPLE_PROVIDERS } from './seed-data/content';

const prisma = new PrismaClient();

async function main() {
  for (const loc of LOCATIONS) {
    await prisma.location.upsert({ where: { slug: loc.slug }, update: loc, create: loc });
  }

  const bySlug = new Map(
    (await prisma.location.findMany({ select: { id: true, slug: true } })).map((l) => [l.slug, l.id]),
  );

  for (const it of ITINERARIES) {
    const days = it.stops.reduce((s, [, n]) => s + n, 0) + 1;
    const data = { title: it.title, summary: it.summary, days, hue: it.hue, tags: it.tags };
    const saved = await prisma.itinerary.upsert({ where: { slug: it.slug }, update: data, create: { slug: it.slug, ...data } });
    await prisma.itineraryStop.deleteMany({ where: { itineraryId: saved.id } });
    await prisma.itineraryStop.createMany({
      data: it.stops.map(([slug, nights, mode], position) => {
        const locationId = bySlug.get(slug);
        if (!locationId) throw new Error(`Itinerary ${it.slug} references unknown location ${slug}`);
        return { itineraryId: saved.id, locationId, position, nights, modeToNext: (mode ?? 'CAR_DRIVER') as TransportMode };
      }),
    });
  }

  for (const p of SAMPLE_PROVIDERS) {
    const data = {
      ...p,
      languages: [...p.languages],
      specialties: [...p.specialties],
      areas: [...p.areas],
      type: p.type as ProviderType,
      verificationStatus: p.verificationStatus as VerificationStatus,
      isSample: true,
    };
    await prisma.providerProfile.upsert({ where: { slug: p.slug }, update: data, create: data });
  }

  for (const [currency, perUsd] of Object.entries(FX_RATES)) {
    await prisma.fxRate.upsert({ where: { currency }, update: { perUsd }, create: { currency, perUsd } });
  }

  // Dev accounts come from .env so no credentials live in source.
  const accounts = [
    { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, name: 'Navigator Admin', role: 'ADMIN' as const },
    { email: process.env.SEED_TRAVELER_EMAIL, password: process.env.SEED_TRAVELER_PASSWORD, name: 'Demo Traveller', role: 'TRAVELER' as const },
  ];
  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    const passwordHash = await bcrypt.hash(a.password, 10);
    await prisma.user.upsert({
      where: { email: a.email },
      update: { role: a.role },
      create: { email: a.email, passwordHash, name: a.name, role: a.role, interests: ['culture', 'tea'] },
    });
  }

  console.log(`Seeded ${LOCATIONS.length} locations, ${ITINERARIES.length} itineraries, ${SAMPLE_PROVIDERS.length} sample providers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
