import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Runs against DATABASE_URL (use the separate test database; see
 * `npm run test:e2e`). Creates its own users and cleans them up.
 */
describe('Trips API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const alice = { email: `alice-${stamp}@navigator.test`, password: `pw-${stamp}-alice`, name: 'Alice' };
  const bob = { email: `bob-${stamp}@navigator.test`, password: `pw-${stamp}-bob`, name: 'Bob' };
  let aliceCookie: string;
  let bobCookie: string;
  let locationIds: string[];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(mod.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);

    // Minimal fixture so the test doesn't depend on seed content.
    const fixtures = [
      { slug: `e2e-kandy-${stamp}`, name: 'Kandy', region: 'hill', lat: 7.2906, lng: 80.6337, entryFeeUsd: 0 },
      { slug: `e2e-ella-${stamp}`, name: 'Ella', region: 'hill', lat: 6.8667, lng: 81.0466, entryFeeUsd: 0 },
      { slug: `e2e-sigiriya-${stamp}`, name: 'Sigiriya', region: 'cultural', lat: 7.957, lng: 80.7603, entryFeeUsd: 36 },
    ];
    locationIds = [];
    for (const f of fixtures) {
      const l = await prisma.location.create({ data: { ...f, category: 'town', summary: 's', description: 'd' } });
      locationIds.push(l.id);
    }

    const signup = async (u: typeof alice) => {
      const res = await request(app.getHttpServer()).post('/api/auth/register').send(u).expect(201);
      return (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    };
    aliceCookie = await signup(alice);
    bobCookie = await signup(bob);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [alice.email, bob.email] } } });
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
    await app.close();
  });

  it('rejects duplicate sign-ups and wrong passwords', async () => {
    await request(app.getHttpServer()).post('/api/auth/register').send(alice).expect(409);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: alice.email, password: 'wrong-password' }).expect(401);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: alice.email.toUpperCase(), password: alice.password }).expect(200);
  });

  it('requires a session for trips', async () => {
    await request(app.getHttpServer()).get('/api/trips').expect(401);
  });

  it('creates a trip with legs and a budget, then reorders it', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/trips')
      .set('Cookie', aliceCookie)
      .send({
        title: 'Hill loop',
        travelers: 2,
        stops: [
          { locationId: locationIds[0], nights: 1, modeToNext: 'TRAIN' },
          { locationId: locationIds[1], nights: 2, modeToNext: 'CAR_DRIVER' },
          { locationId: locationIds[2], nights: 0, modeToNext: 'CAR_DRIVER' },
        ],
      })
      .expect(201);

    const trip = created.body;
    expect(trip.days).toBe(4);
    expect(trip.stops).toHaveLength(3);
    expect(trip.stops[0].leg.durationMin).toBeGreaterThan(300); // the slow hill railway
    expect(trip.stops[2].leg).toBeNull();
    expect(trip.budget.entryFees).toBe(72);
    expect(trip.budget.total).toBeGreaterThan(0);

    const reordered = await request(app.getHttpServer())
      .put(`/api/trips/${trip.id}/stops`)
      .set('Cookie', aliceCookie)
      .send({
        stops: [
          { locationId: locationIds[2], nights: 1, modeToNext: 'CAR_DRIVER' },
          { locationId: locationIds[0], nights: 1, modeToNext: 'TRAIN' },
          { locationId: locationIds[1], nights: 0, modeToNext: 'CAR_DRIVER' },
        ],
      })
      .expect(200);
    expect(reordered.body.stops.map((s: { location: { name: string } }) => s.location.name)).toEqual(['Sigiriya', 'Kandy', 'Ella']);
  });

  it("never exposes one traveller's trip to another", async () => {
    const [trip] = (await request(app.getHttpServer()).get('/api/trips').set('Cookie', aliceCookie).expect(200)).body;
    await request(app.getHttpServer()).get(`/api/trips/${trip.id}`).set('Cookie', bobCookie).expect(404);
    await request(app.getHttpServer()).patch(`/api/trips/${trip.id}`).set('Cookie', bobCookie).send({ title: 'mine now' }).expect(404);
    await request(app.getHttpServer()).delete(`/api/trips/${trip.id}`).set('Cookie', bobCookie).expect(404);
    const bobs = (await request(app.getHttpServer()).get('/api/trips').set('Cookie', bobCookie).expect(200)).body;
    expect(bobs).toHaveLength(0);
  });

  it('duplicates, archives and validates input', async () => {
    const [trip] = (await request(app.getHttpServer()).get('/api/trips').set('Cookie', aliceCookie)).body;
    const copy = (await request(app.getHttpServer()).post(`/api/trips/${trip.id}/duplicate`).set('Cookie', aliceCookie).expect(201)).body;
    expect(copy.title).toBe('Hill loop (copy)');
    expect(copy.stops).toHaveLength(3);

    await request(app.getHttpServer()).patch(`/api/trips/${copy.id}`).set('Cookie', aliceCookie).send({ status: 'ARCHIVED' }).expect(200);
    const archived = (await request(app.getHttpServer()).get('/api/trips?status=ARCHIVED').set('Cookie', aliceCookie)).body;
    expect(archived.map((t: { id: string }) => t.id)).toEqual([copy.id]);

    await request(app.getHttpServer()).patch(`/api/trips/${trip.id}`).set('Cookie', aliceCookie).send({ travelers: 0 }).expect(400);
    await request(app.getHttpServer()).patch(`/api/trips/${trip.id}`).set('Cookie', aliceCookie).send({ userId: 'x' }).expect(400);
    await request(app.getHttpServer())
      .put(`/api/trips/${trip.id}/stops`)
      .set('Cookie', aliceCookie)
      .send({ stops: [{ locationId: 'does-not-exist', nights: 1, modeToNext: 'CAR_DRIVER' }] })
      .expect(400);
  });

  describe('Google-picked places', () => {
    const placeId = `ChIJe2e${stamp}abcdefghij`;
    const body = { placeId, name: 'Hotel Test Beach', address: '1 Beach Rd, Mirissa', lat: 5.9483, lng: 80.4716 };

    afterAll(async () => {
      await prisma.tripStop.deleteMany({ where: { location: { googlePlaceId: placeId } } });
      await prisma.location.deleteMany({ where: { googlePlaceId: placeId } });
    });

    it('stores a place once and reuses it', async () => {
      const first = await request(app.getHttpServer()).post('/api/places/custom').send(body).expect(200);
      expect(first.body).toMatchObject({ name: 'Hotel Test Beach', category: 'custom', source: 'GOOGLE', entryFeeUsd: 0 });
      expect(first.body.region).toBeTruthy();
      const again = await request(app.getHttpServer()).post('/api/places/custom').send({ ...body, name: 'Renamed by someone else' }).expect(200);
      expect(again.body.id).toBe(first.body.id);
      expect(again.body.name).toBe('Hotel Test Beach');
    });

    it('rejects coordinates outside Sri Lanka and bad input', async () => {
      await request(app.getHttpServer()).post('/api/places/custom').send({ ...body, placeId: 'ChIJoutsideoutside1', lat: 51.5, lng: -0.12 }).expect(400);
      await request(app.getHttpServer()).post('/api/places/custom').send({ ...body, placeId: 'short' }).expect(400);
      await request(app.getHttpServer()).post('/api/places/custom').send({ ...body, extra: 'x' }).expect(400);
    });

    it('stays out of public lists and suggestions', async () => {
      const list = (await request(app.getHttpServer()).get('/api/locations').expect(200)).body as { name: string }[];
      expect(list.find((l) => l.name === 'Hotel Test Beach')).toBeUndefined();
      const place = (await request(app.getHttpServer()).post('/api/places/custom').send(body)).body;
      const sugg = await request(app.getHttpServer()).post('/api/planner/suggestions').send({ locationIds: [place.id], interests: [] }).expect(200);
      expect(sugg.body.some((s: { location: { id: string } }) => s.location.id === place.id)).toBe(false);
    });

    it('works as a trip stop with legs and a budget', async () => {
      const place = (await request(app.getHttpServer()).post('/api/places/custom').send(body)).body;
      const res = await request(app.getHttpServer())
        .post('/api/trips')
        .set('Cookie', aliceCookie)
        .send({
          stops: [
            { locationId: locationIds[0], nights: 1, modeToNext: 'CAR_DRIVER' },
            { locationId: place.id, nights: 0, modeToNext: 'CAR_DRIVER' },
          ],
        })
        .expect(201);
      expect(res.body.stops[1].location.name).toBe('Hotel Test Beach');
      expect(res.body.stops[0].leg.distanceKm).toBeGreaterThan(0);
    });
  });

  it('keeps admin routes admin-only', async () => {
    await request(app.getHttpServer()).get('/api/admin/providers').set('Cookie', aliceCookie).expect(403);
    await request(app.getHttpServer()).get('/api/admin/providers').expect(401);
  });
});
