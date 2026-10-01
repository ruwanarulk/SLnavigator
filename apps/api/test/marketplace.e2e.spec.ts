import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { approveProvider, createApp, isoDate, signup, signupProvider } from './helpers';

describe('Posting and bidding (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const pw = `pw-${stamp}-m`;
  const email = (n: string) => `${n}-${stamp}@navigator.test`;
  const emails = ['trav', 'hill', 'south', 'pending', 'driver', 'rival'].map(email);
  let trav: string;
  let hill: string;
  let south: string;
  let pending: string;
  let driver: string;
  let tripId: string;
  let postId: string;
  let locIds: string[] = [];
  const http = () => request(app.getHttpServer());

  const postBody = (over: Record<string, unknown> = {}) => ({
    startDate: isoDate(30),
    adults: 2,
    children: 1,
    budgetMinUsd: 600,
    budgetMaxUsd: 1000,
    need: 'GUIDE_AND_TRANSPORT',
    interests: ['birding', 'tea'],
    languages: ['German'],
    notes: 'Early starts please.',
    deadlineHours: 48,
    ...over,
  });
  const bid = { priceUsd: 780, inclusions: ['CAR_DRIVER', 'GUIDE'], pitch: 'I grew up near the Knuckles and love dawn bird walks.', availabilityConfirmed: true };

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    for (const [slug, name, lat, lng] of [['a', 'Kandy', 7.29, 80.63], ['b', 'Ella', 6.87, 81.05]] as const) {
      const l = await prisma.location.create({ data: { slug: `mk-${slug}-${stamp}`, name: `${name} ${stamp}`, category: 'town', region: 'hill', lat, lng, summary: 's', description: 'd' } });
      locIds.push(l.id);
    }
    trav = await signup(app, emails[0], pw, 'Samira Tester');
    hill = (await signupProvider(app, emails[1], pw, 'GUIDE', `Hill Guide ${stamp}`)).cookie;
    south = (await signupProvider(app, emails[2], pw, 'GUIDE', `South Guide ${stamp}`)).cookie;
    pending = (await signupProvider(app, emails[3], pw, 'GUIDE', `Pending Guide ${stamp}`)).cookie;
    driver = (await signupProvider(app, emails[4], pw, 'TRANSPORT', `Driver ${stamp}`)).cookie;
    await approveProvider(prisma, emails[1], { areas: ['hill', 'cultural'], languages: ['English', 'German'], specialties: ['Birding', 'Tea country'] });
    await approveProvider(prisma, emails[2], { areas: ['south'] });
    await approveProvider(prisma, emails[4], { areas: ['hill'] });
    const trip = await http()
      .post('/api/trips')
      .set('Cookie', trav)
      .send({ title: 'Hill loop', stops: [{ locationId: locIds[0], nights: 2, modeToNext: 'TRAIN' }, { locationId: locIds[1], nights: 0, modeToNext: 'CAR_DRIVER' }] })
      .expect(201);
    tripId = trip.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await app.close();
  });

  it('checks the request before posting it', async () => {
    const post = (b: object) => http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send(b);
    await post(postBody({ startDate: isoDate(0) })).expect(400);
    await post(postBody({ budgetMinUsd: 900, budgetMaxUsd: 500 })).expect(400);
    await post(postBody({ startDate: isoDate(2), deadlineHours: 72 })).expect(400); // window runs past the start
    await post(postBody({ deadlineHours: 5 })).expect(400);
    await http().post(`/api/trips/${tripId}/post`).send(postBody()).expect(401);
    await http().post(`/api/trips/${tripId}/post`).set('Cookie', hill).send(postBody()).expect(404); // not their trip
  });

  it('posts the trip, freezes the plan, and tells only the matching providers', async () => {
    const res = await http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send(postBody()).expect(201);
    postId = res.body.id;
    expect(res.body).toMatchObject({ status: 'OPEN', adults: 2, children: 1, biddingOpen: true, bids: [] });
    const trip = (await http().get(`/api/trips/${tripId}`).set('Cookie', trav).expect(200)).body;
    expect(trip).toMatchObject({ status: 'POSTED', travelers: 3, post: { id: postId, status: 'OPEN', bidCount: 0 } });

    const types = async (e: string) => (await prisma.notification.findMany({ where: { user: { email: e }, type: 'request.new' } })).length;
    expect(await types(emails[1])).toBe(1); // hill guide covers the route
    expect(await types(emails[2])).toBe(0); // south guide does not
    expect(await types(emails[3])).toBe(0); // not verified yet
    expect(await types(emails[4])).toBe(0); // drivers can't guide
    await http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send(postBody()).expect(409); // already posted
  });

  it('refuses edits to a posted plan but still allows renaming', async () => {
    await http().put(`/api/trips/${tripId}/stops`).set('Cookie', trav).send({ stops: [{ locationId: locIds[0], nights: 1, modeToNext: 'CAR_DRIVER' }] }).expect(409);
    await http().patch(`/api/trips/${tripId}`).set('Cookie', trav).send({ travelers: 5 }).expect(409);
    await http().patch(`/api/trips/${tripId}`).set('Cookie', trav).send({ status: 'POSTED' }).expect(400);
    await http().delete(`/api/trips/${tripId}`).set('Cookie', trav).expect(409);
    await http().patch(`/api/trips/${tripId}`).set('Cookie', trav).send({ title: 'Hill loop (posted)' }).expect(200);
  });

  it('shows providers only what they should see', async () => {
    const hillList = (await http().get('/api/provider/requests').set('Cookie', hill).expect(200)).body;
    expect(hillList).toMatchObject({ matching: 1, all: 1 });
    const item = hillList.items[0];
    expect(item).toMatchObject({ id: postId, travellerName: 'Samira T.', days: 3, adults: 2, children: 1, commissionPct: 12, myBid: null });
    expect(item.matchTags).toEqual(['Birding', 'Tea country', 'Speaks German']);
    expect(JSON.stringify(item)).not.toMatch(/Samira Tester|@navigator\.test/);
    expect(item.stops.map((s: { nights: number }) => s.nights)).toEqual([2, 0]);

    const southList = (await http().get('/api/provider/requests').set('Cookie', south).expect(200)).body;
    expect(southList).toMatchObject({ matching: 0, all: 1 });
    expect((await http().get('/api/provider/requests?scope=all').set('Cookie', south)).body.items).toHaveLength(1);
    await http().get('/api/provider/requests').set('Cookie', pending).expect(403); // unverified
    await http().get('/api/provider/requests').set('Cookie', trav).expect(403); // travellers aren't providers
  });

  it('validates and records bids, showing the provider what they would receive', async () => {
    const put = (cookie: string, b: object) => http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', cookie).send(b);
    await put(hill, { ...bid, priceUsd: 5 }).expect(400);
    await put(hill, { ...bid, pitch: 'short' }).expect(400);
    await put(hill, { ...bid, inclusions: ['PRIVATE_JET'] }).expect(400);
    await put(hill, { ...bid, availabilityConfirmed: false }).expect(400);
    await put(pending, bid).expect(403);

    const first = await put(hill, bid).expect(200);
    expect(first.body).toMatchObject({ status: 'PENDING', priceUsd: 780, youReceiveUsd: 686 });
    const revised = await put(hill, { ...bid, priceUsd: 740 }).expect(200);
    expect(revised.body.id).toBe(first.body.id);
    await put(south, { ...bid, priceUsd: 900 }).expect(200); // anyone verified may bid on any open request

    const notes = await prisma.notification.findMany({ where: { user: { email: emails[0] }, type: { in: ['bid.new', 'bid.updated'] } }, orderBy: { createdAt: 'asc' } });
    expect(notes.map((n) => n.type)).toEqual(['bid.new', 'bid.updated', 'bid.new']);

    const mine = (await http().get('/api/provider/bids').set('Cookie', hill).expect(200)).body;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ priceUsd: 740, postStatus: 'OPEN', tripTitle: 'Hill loop (posted)' });
  });

  it('gives the traveller every bid with the provider details they need to choose', async () => {
    const post = (await http().get(`/api/trips/${tripId}/post`).set('Cookie', trav).expect(200)).body;
    expect(post.bids).toHaveLength(2);
    const b = post.bids.find((x: { priceUsd: number }) => x.priceUsd === 740);
    expect(b.provider).toMatchObject({ type: 'GUIDE', languages: ['English', 'German'] });
    expect(b.provider.slug).toBeTruthy();
    expect(JSON.stringify(post)).not.toMatch(/phone|@navigator\.test|licenceNumber/);
    await http().get(`/api/trips/${tripId}/post`).set('Cookie', hill).expect(404); // not the owner
    const trip = (await http().get(`/api/trips/${tripId}`).set('Cookie', trav)).body;
    expect(trip.post.bidCount).toBe(2);
  });

  it('lets a provider withdraw and re-bid, and stops bids after the deadline', async () => {
    await http().delete(`/api/provider/requests/${postId}/bid`).set('Cookie', south).expect(204);
    await http().delete(`/api/provider/requests/${postId}/bid`).set('Cookie', south).expect(404);
    expect(((await http().get(`/api/trips/${tripId}/post`).set('Cookie', trav)).body.bids as unknown[]).length).toBe(1);
    await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', south).send({ ...bid, priceUsd: 850 }).expect(200);

    await prisma.tripPost.update({ where: { id: postId }, data: { deadline: new Date(Date.now() - 1000) } });
    await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', hill).send(bid).expect(409);
    expect((await http().get('/api/provider/requests').set('Cookie', hill)).body.all).toBe(0); // closed requests drop off the list
    const post = (await http().get(`/api/trips/${tripId}/post`).set('Cookie', trav)).body;
    expect(post.biddingOpen).toBe(false); // the traveller can still see the bids
    expect(post.bids).toHaveLength(2);
  });

  it('withdraws the request: the plan unlocks and bids are cancelled, then it can be re-posted', async () => {
    await http().delete(`/api/trips/${tripId}/post`).set('Cookie', trav).expect(204);
    const trip = (await http().get(`/api/trips/${tripId}`).set('Cookie', trav)).body;
    expect(trip.status).toBe('DRAFT');
    expect(trip.post.status).toBe('WITHDRAWN');
    expect(await prisma.bid.count({ where: { postId, status: 'PENDING' } })).toBe(0);
    await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', hill).send(bid).expect(404);
    expect((await prisma.notification.count({ where: { type: 'request.withdrawn', user: { email: { in: [emails[1], emails[2]] } } } }))).toBe(2);
    await http().put(`/api/trips/${tripId}/stops`).set('Cookie', trav).send({ stops: [{ locationId: locIds[0], nights: 1, modeToNext: 'CAR_DRIVER' }, { locationId: locIds[1], nights: 0, modeToNext: 'CAR_DRIVER' }] }).expect(200);

    const again = await http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send(postBody({ deadlineHours: 24 })).expect(201);
    expect(again.body).toMatchObject({ id: postId, status: 'OPEN', bids: [] });
    expect((await http().get('/api/provider/requests').set('Cookie', hill)).body.all).toBe(1);
  });

  it('only lists posted trips under the right statuses', async () => {
    const active = (await http().get('/api/trips').set('Cookie', trav).expect(200)).body as { id: string; status: string }[];
    expect(active.find((t) => t.id === tripId)?.status).toBe('POSTED');
    expect((await http().get('/api/trips?status=ARCHIVED').set('Cookie', trav)).body).toHaveLength(0);
  });
});
