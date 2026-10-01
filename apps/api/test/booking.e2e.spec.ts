import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { approveProvider, cleanupUsers, createApp, isoDate, signup, signupProvider } from './helpers';

describe('Choosing and booking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const pw = `pw-${stamp}-b`;
  const email = (n: string) => `${n}-${stamp}@navigator.test`;
  const emails = ['trav', 'guidea', 'guideb', 'other'].map(email);
  let trav: string;
  let a: string;
  let b: string;
  let other: string;
  let tripId: string;
  let postId: string;
  let bidA: string;
  let bidB: string;
  let bookingId: string;
  const locIds: string[] = [];
  const http = () => request(app.getHttpServer());
  const stops = () => [{ locationId: locIds[0], nights: 2, modeToNext: 'CAR_DRIVER' }, { locationId: locIds[1], nights: 0, modeToNext: 'CAR_DRIVER' }];
  const postBody = (over: Record<string, unknown> = {}) => ({ startDate: isoDate(30), adults: 2, children: 0, budgetMinUsd: 500, budgetMaxUsd: 1200, need: 'GUIDE_AND_TRANSPORT', interests: [], languages: [], notes: '', deadlineHours: 48, ...over });
  const bid = (priceUsd: number) => ({ priceUsd, inclusions: ['GUIDE'], pitch: 'Happy to show you the hills at a gentle pace.', availabilityConfirmed: true });

  async function newPostedTrip(title: string) {
    const t = await http().post('/api/trips').set('Cookie', trav).send({ title, stops: stops() }).expect(201);
    const post = await http().post(`/api/trips/${t.body.id}/post`).set('Cookie', trav).send(postBody()).expect(201);
    return { tripId: t.body.id as string, postId: post.body.id as string };
  }

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    for (const [slug, name] of [['a', 'Kandy'], ['b', 'Ella']] as const) {
      const l = await prisma.location.create({ data: { slug: `bk-${slug}-${stamp}`, name: `${name} ${stamp}`, category: 'town', region: 'hill', lat: slug === 'a' ? 7.29 : 6.87, lng: slug === 'a' ? 80.63 : 81.05, summary: 's', description: 'd' } });
      locIds.push(l.id);
    }
    trav = await signup(app, emails[0], pw, 'Samira Tester');
    other = await signup(app, emails[3], pw, 'Nosy Parker');
    a = (await signupProvider(app, emails[1], pw, 'GUIDE', `Guide A ${stamp}`)).cookie;
    b = (await signupProvider(app, emails[2], pw, 'GUIDE', `Guide B ${stamp}`)).cookie;
    await approveProvider(prisma, emails[1]);
    await approveProvider(prisma, emails[2]);
    ({ tripId, postId } = await newPostedTrip('Hill loop'));
    bidA = (await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', a).send(bid(800)).expect(200)).body.id;
    bidB = (await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', b).send(bid(950)).expect(200)).body.id;
  });

  afterAll(async () => {
    await cleanupUsers(prisma, emails);
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await app.close();
  });

  it('lets only the traveller shortlist a bid', async () => {
    const url = `/api/trips/${tripId}/bids/${bidA}/shortlist`;
    await http().put(url).set('Cookie', trav).send({ shortlisted: true }).expect(200);
    const post = (await http().get(`/api/trips/${tripId}/post`).set('Cookie', trav)).body;
    expect(post.bids.find((x: { id: string }) => x.id === bidA).shortlisted).toBe(true);
    expect(post.bids.find((x: { id: string }) => x.id === bidB).shortlisted).toBe(false);
    await http().put(url).set('Cookie', other).send({ shortlisted: true }).expect(404);
    await http().put(url).set('Cookie', a).send({ shortlisted: false }).expect(404);
    await http().put(url).set('Cookie', trav).send({ shortlisted: 'yes' }).expect(400);
  });

  it('accepts one bid: books it, rejects the rest and tells everyone', async () => {
    await http().post(`/api/trips/${tripId}/bids/${bidA}/accept`).set('Cookie', other).expect(404);
    await http().post(`/api/trips/${tripId}/bids/${bidA}/accept`).set('Cookie', a).expect(404);
    const res = await http().post(`/api/trips/${tripId}/bids/${bidA}/accept`).set('Cookie', trav).expect(201);
    bookingId = res.body.id;

    const trip = (await http().get(`/api/trips/${tripId}`).set('Cookie', trav)).body;
    expect(trip.status).toBe('BOOKED');
    expect(trip.post.status).toBe('CLOSED');
    const bids = await prisma.bid.findMany({ where: { postId }, orderBy: { priceUsd: 'asc' } });
    expect(bids.map((x) => x.status)).toEqual(['ACCEPTED', 'REJECTED']);
    const types = async (e: string) => (await prisma.notification.findMany({ where: { user: { email: e }, type: { in: ['bid.accepted', 'bid.rejected'] } } })).map((n) => n.type);
    expect(await types(emails[1])).toEqual(['bid.accepted']);
    expect(await types(emails[2])).toEqual(['bid.rejected']);

    await http().post(`/api/trips/${tripId}/bids/${bidA}/accept`).set('Cookie', trav).expect(409);
    await http().post(`/api/trips/${tripId}/bids/${bidB}/accept`).set('Cookie', trav).expect(409);
    await http().put(`/api/trips/${tripId}/stops`).set('Cookie', trav).send({ stops: stops() }).expect(409);
    expect((await http().get(`/api/trips/${tripId}/booking`).set('Cookie', trav).expect(200)).body.id).toBe(bookingId);
  });

  it('shows each side what they should know, and nothing to outsiders', async () => {
    const t = (await http().get(`/api/bookings/${bookingId}`).set('Cookie', trav).expect(200)).body;
    expect(t).toMatchObject({ viewer: 'TRAVELLER', status: 'CONFIRMED', phase: 'UPCOMING', priceUsd: 800, pricePerPersonUsd: 400, cancellable: true });
    expect(t.provider.phone).toBeTruthy(); // revealed once booked
    expect(t).not.toHaveProperty('youReceiveUsd');
    expect(t.traveller.name).toBe('Samira T.');

    const p = (await http().get(`/api/bookings/${bookingId}`).set('Cookie', a).expect(200)).body;
    expect(p).toMatchObject({ viewer: 'PROVIDER', priceUsd: 800, youReceiveUsd: 704, commissionPct: 12 });
    expect(p.traveller).toMatchObject({ name: 'Samira Tester', email: emails[0] });
    expect(p.provider.phone).toBeNull();

    await http().get(`/api/bookings/${bookingId}`).set('Cookie', b).expect(404); // the guide who lost
    await http().get(`/api/bookings/${bookingId}`).set('Cookie', other).expect(404);
    await http().get(`/api/bookings/${bookingId}`).expect(401);

    expect((await http().get('/api/bookings').set('Cookie', trav)).body).toHaveLength(1);
    expect((await http().get('/api/bookings').set('Cookie', a)).body).toHaveLength(1);
    expect((await http().get('/api/bookings').set('Cookie', b)).body).toHaveLength(0);
    const mine = (await http().get('/api/provider/bids').set('Cookie', b)).body;
    expect(mine[0].status).toBe('REJECTED');
  });

  it('turns a booking into a completed trip once the last day has passed', async () => {
    await prisma.tripPost.update({ where: { id: postId }, data: { startDate: new Date(Date.now() - 10 * 86_400_000), endDate: new Date(Date.now() - 8 * 86_400_000) } });
    const d = (await http().get(`/api/bookings/${bookingId}`).set('Cookie', trav)).body;
    expect(d).toMatchObject({ phase: 'COMPLETED', cancellable: false });
    const list = (await http().get('/api/trips').set('Cookie', trav)).body as { id: string; status: string }[];
    expect(list.find((x) => x.id === tripId)?.status).toBe('COMPLETED');
    await http().post(`/api/bookings/${bookingId}/cancel`).set('Cookie', trav).send({ reason: 'Changed my mind' }).expect(400);
  });

  describe('cancelling', () => {
    let t2: string;
    let p2: string;
    let booking2: string;

    it('needs a reason, then frees the trip for another round', async () => {
      ({ tripId: t2, postId: p2 } = await newPostedTrip('Second trip'));
      const bid2 = (await http().put(`/api/provider/requests/${p2}/bid`).set('Cookie', a).send(bid(700)).expect(200)).body.id;
      booking2 = (await http().post(`/api/trips/${t2}/bids/${bid2}/accept`).set('Cookie', trav).expect(201)).body.id;

      await http().post(`/api/bookings/${booking2}/cancel`).set('Cookie', a).send({ reason: 'no' }).expect(400);
      await http().post(`/api/bookings/${booking2}/cancel`).set('Cookie', other).send({ reason: 'Not my booking at all' }).expect(404);
      const res = await http().post(`/api/bookings/${booking2}/cancel`).set('Cookie', a).send({ reason: 'My car broke down that week' }).expect(200);
      expect(res.body).toMatchObject({ status: 'CANCELLED', phase: 'CANCELLED', cancelledBy: 'PROVIDER', cancelReason: 'My car broke down that week' });
      expect(res.body.traveller.email).toBeNull(); // contact details end with the booking

      const trip = (await http().get(`/api/trips/${t2}`).set('Cookie', trav)).body;
      expect(trip.status).toBe('DRAFT');
      const note = await prisma.notification.findFirst({ where: { user: { email: emails[0] }, type: 'booking.cancelled' } });
      expect(note?.body).toContain('My car broke down that week');
      await http().post(`/api/bookings/${booking2}/cancel`).set('Cookie', a).send({ reason: 'Trying twice' }).expect(409);
    });

    it('can be posted and booked again with someone else', async () => {
      const again = await http().post(`/api/trips/${t2}/post`).set('Cookie', trav).send(postBody()).expect(201);
      expect(again.body.bids).toEqual([]);
      const bid3 = (await http().put(`/api/provider/requests/${again.body.id}/bid`).set('Cookie', b).send(bid(720)).expect(200)).body.id;
      const second = await http().post(`/api/trips/${t2}/bids/${bid3}/accept`).set('Cookie', trav).expect(201);
      expect(second.body.id).not.toBe(booking2);
      expect((await http().get(`/api/trips/${t2}/booking`).set('Cookie', trav)).body.id).toBe(second.body.id); // the latest one
      expect((await http().get('/api/bookings').set('Cookie', trav)).body).toHaveLength(3);
    });
  });
});
