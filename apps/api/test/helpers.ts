import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

export async function createApp() {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(mod.createNestApplication());
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export const cookieOf = (res: { headers: Record<string, unknown> }) => (res.headers['set-cookie'] as string[])[0].split(';')[0];

export async function signup(app: INestApplication, email: string, password: string, name = 'Test User') {
  const res = await request(app.getHttpServer()).post('/api/auth/register').send({ email, password, name }).expect(201);
  return cookieOf(res);
}

export async function signupProvider(
  app: INestApplication,
  email: string,
  password: string,
  type: 'GUIDE' | 'COMPANY' | 'TRANSPORT' = 'GUIDE',
  displayName = 'Test Guide',
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/register-provider')
    .send({ email, password, name: 'Test Owner', type, displayName, city: 'Kandy', phone: '+94 77 123 4567' })
    .expect(201);
  return { cookie: cookieOf(res), body: res.body };
}

export async function adminCookie(app: INestApplication, prisma: PrismaService, email: string, password: string) {
  await prisma.user.create({ data: { email, name: 'Test Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(password, 4) } });
  const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
  return cookieOf(res);
}

/** 1x1 PNG: passes the file-type check. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** Walks a fresh provider through profile, documents and submission. */
export async function submitProvider(app: INestApplication, cookie: string, over: Record<string, unknown> = {}) {
  const http = request(app.getHttpServer());
  await http
    .patch('/api/provider/me')
    .set('Cookie', cookie)
    .send({
      bio: 'Licensed guide with eight years of birding and hiking trips in the hill country.',
      languages: ['English', 'German'],
      areas: ['hill', 'cultural'],
      specialties: ['Birding', 'Hiking'],
      licenceNumber: 'SLTDA-12345',
      businessRegNo: 'PV 99999',
      priceFromUsd: 60,
      priceToUsd: 110,
      ...over,
    })
    .expect(200);
  for (const kind of ['ID', 'LICENCE', 'BUSINESS_REG', 'INSURANCE']) {
    await request(app.getHttpServer()).post('/api/provider/me/documents').set('Cookie', cookie).field('kind', kind).attach('file', PNG, `${kind}.png`);
  }
  return request(app.getHttpServer()).post('/api/provider/me/submit').set('Cookie', cookie);
}

/** Marks a provider verified directly (the verification flow has its own test). */
export async function approveProvider(prisma: PrismaService, email: string, data: { areas?: string[]; languages?: string[]; specialties?: string[]; displayName?: string } = {}) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { provider: true } });
  return prisma.providerProfile.update({
    where: { id: user.provider!.id },
    data: {
      verificationStatus: 'APPROVED',
      submittedAt: new Date(),
      bio: 'A verified provider used in automated tests.',
      areas: data.areas ?? ['hill'],
      languages: data.languages ?? ['English'],
      specialties: data.specialties ?? [],
      ...(data.displayName ? { displayName: data.displayName } : {}),
    },
  });
}

export const isoDate = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

/** Removes everything a spec created for these users, in an order the foreign keys allow. */
export async function cleanupUsers(prisma: PrismaService, emails: string[]) {
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, provider: { select: { id: true } } } });
  const userIds = users.map((u) => u.id);
  const providerIds = users.flatMap((u) => (u.provider ? [u.provider.id] : []));
  await prisma.booking.deleteMany({ where: { OR: [{ travellerId: { in: userIds } }, { providerId: { in: providerIds } }] } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.providerProfile.deleteMany({ where: { id: { in: providerIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
