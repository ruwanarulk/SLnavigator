import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { approveProvider, cleanupUsers, createApp, isoDate, signup, signupProvider } from './helpers';

describe('Messaging (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const pw = `pw-${stamp}-c`;
  const email = (n: string) => `${n}-${stamp}@navigator.test`;
  const emails = ['trav', 'guidea', 'guideb', 'other'].map(email);
  let trav: string;
  let a: string;
  let b: string;
  let other: string;
  let tripId: string;
  let postId: string;
  let providerA: string;
  let providerB: string;
  let convA: string;
  let convB: string;
  const locIds: string[] = [];
  const http = () => request(app.getHttpServer());
  const say = (cookie: string, conv: string, body: string) => http().post(`/api/conversations/${conv}/messages`).set('Cookie', cookie).send({ body });
  const summary = async (cookie: string) => (await http().get('/api/notifications/summary').set('Cookie', cookie).expect(200)).body as { unread: number; messages: number };
  const bid = { priceUsd: 700, inclusions: ['GUIDE'], pitch: 'Happy to show you the hills at a gentle pace.', availabilityConfirmed: true };

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    for (const [slug, name] of [['a', 'Kandy'], ['b', 'Ella']] as const) {
      const l = await prisma.location.create({ data: { slug: `ms-${slug}-${stamp}`, name: `${name} ${stamp}`, category: 'town', region: 'hill', lat: 7.2, lng: 80.6, summary: 's', description: 'd' } });
      locIds.push(l.id);
    }
    trav = await signup(app, emails[0], pw, 'Samira Tester');
    other = await signup(app, emails[3], pw, 'Nosy Parker');
    a = (await signupProvider(app, emails[1], pw, 'GUIDE', `Guide A ${stamp}`)).cookie;
    b = (await signupProvider(app, emails[2], pw, 'GUIDE', `Guide B ${stamp}`)).cookie;
    providerA = (await approveProvider(prisma, emails[1])).id;
    providerB = (await approveProvider(prisma, emails[2])).id;
    const trip = await http().post('/api/trips').set('Cookie', trav).send({ title: 'Hill loop', stops: [{ locationId: locIds[0], nights: 1, modeToNext: 'CAR_DRIVER' }, { locationId: locIds[1], nights: 0, modeToNext: 'CAR_DRIVER' }] }).expect(201);
    tripId = trip.body.id;
    postId = (await http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send({ startDate: isoDate(30), adults: 2, children: 0, budgetMinUsd: 500, budgetMaxUsd: 1000, need: 'GUIDE_AND_TRANSPORT', interests: [], languages: [], notes: '', deadlineHours: 48 }).expect(201)).body.id;
    await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', a).send(bid).expect(200);
  });

  afterAll(async () => {
    await cleanupUsers(prisma, emails);
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await app.close();
  });

  it('lets a provider ask a question before bidding, and the traveller reply', async () => {
    convB = (await http().post('/api/conversations').set('Cookie', b).send({ tripId }).expect(200)).body.id;
    expect((await http().post('/api/conversations').set('Cookie', b).send({ tripId }).expect(200)).body.id).toBe(convB); // same thread
    await say(b, convB, 'Hello! Do you need a driver who speaks German on the Ella day?').expect(201);
    expect(await summary(trav)).toMatchObject({ messages: 1 });
    // the traveller can answer even though guide B has not bid
    expect((await http().post('/api/conversations').set('Cookie', trav).send({ tripId, providerId: providerB }).expect(200)).body.id).toBe(convB);
    await say(trav, convB, 'Yes please, that would be ideal.').expect(201);
  });

  it('opens a thread with a bidder, but not with a stranger', async () => {
    convA = (await http().post('/api/conversations').set('Cookie', trav).send({ tripId, providerId: providerA }).expect(200)).body.id;
    await http().post('/api/conversations').set('Cookie', trav).send({ tripId }).expect(400);
    await http().post('/api/conversations').set('Cookie', other).send({ tripId, providerId: providerA }).expect(403); // not a provider
    await http().post('/api/conversations').set('Cookie', trav).send({ tripId: 'nope', providerId: providerA }).expect(404);
    await http().post('/api/conversations').send({ tripId }).expect(401);
  });

  it('keeps conversations private to the two people in them', async () => {
    await http().get(`/api/conversations/${convA}`).set('Cookie', other).expect(404);
    await http().get(`/api/conversations/${convA}`).set('Cookie', b).expect(404); // another provider
    await say(other, convA, 'hello').expect(404);
    const inbox = (await http().get('/api/conversations').set('Cookie', trav).expect(200)).body as { id: string }[];
    expect(inbox.map((c) => c.id).sort()).toEqual([convA, convB].sort());
    expect((await http().get('/api/conversations').set('Cookie', other)).body).toEqual([]);
  });

  it('counts unread messages per person and clears them when a thread is opened', async () => {
    await say(a, convA, 'Hi Samira, I would love to guide you. Any dietary needs?').expect(201);
    await say(a, convA, 'Also, are you flying into Colombo?').expect(201);
    expect(await summary(trav)).toMatchObject({ messages: 2 }); // convB was already read by the traveller replying
    const inbox = (await http().get('/api/conversations').set('Cookie', trav)).body as { id: string; unread: number; lastMessage: { mine: boolean } }[];
    expect(inbox.find((c) => c.id === convA)).toMatchObject({ unread: 2 });
    const thread = (await http().get(`/api/conversations/${convA}`).set('Cookie', trav).expect(200)).body;
    expect(thread.messages.map((m: { mine: boolean }) => m.mine)).toEqual([false, false]);
    expect(thread.conversation).toMatchObject({ viewer: 'TRAVELLER', counterparty: { kind: 'PROVIDER' }, canSend: true, contactAllowed: false });
    expect(await summary(trav)).toMatchObject({ messages: 0 });
    expect(await summary(a)).toMatchObject({ messages: 0 });
  });

  it('polls for just the new messages', async () => {
    const first = (await http().get(`/api/conversations/${convA}`).set('Cookie', trav)).body.messages as { createdAt: string }[];
    const last = first[first.length - 1].createdAt;
    expect((await http().get(`/api/conversations/${convA}?after=${encodeURIComponent(last)}`).set('Cookie', trav)).body.messages).toEqual([]);
    await say(a, convA, 'One more thing: bring a light rain jacket.').expect(201);
    const fresh = (await http().get(`/api/conversations/${convA}?after=${encodeURIComponent(last)}`).set('Cookie', trav)).body.messages;
    expect(fresh).toHaveLength(1);
    expect(fresh[0].body).toContain('rain jacket');
    await http().get(`/api/conversations/${convA}?after=not-a-date`).set('Cookie', trav).expect(400);
  });

  it('notifies once per burst, not on every line', async () => {
    const n = await prisma.notification.count({ where: { user: { email: emails[0] }, type: 'message.new', body: { contains: 'Colombo' } } });
    expect(n).toBe(0); // the second line of the burst stayed quiet
    const first = await prisma.notification.findMany({ where: { user: { email: emails[0] }, type: 'message.new' }, orderBy: { createdAt: 'asc' } });
    expect(first.length).toBeGreaterThanOrEqual(2); // one from guide B, one from guide A
    expect(first.some((x) => x.title.includes(`Guide A ${stamp}`) && x.link === `/inbox/${convA}`)).toBe(true);
    expect(first.filter((x) => x.title.includes(`Guide A ${stamp}`))).toHaveLength(2); // opening the thread started a fresh burst
  });

  it('blocks contact details until a booking exists, and validates length', async () => {
    for (const text of ['call me on 0771234567', 'email me at guide@gmail.com', 'chat on WhatsApp instead']) {
      const res = await say(trav, convA, text).expect(422);
      expect(res.body.message).toContain('until a trip is booked');
    }
    await say(trav, convA, 'Could we start at 6:30 am on 12 January for $700?').expect(201);
    await say(trav, convA, '   ').expect(400);
    await say(trav, convA, 'x'.repeat(2050)).expect(400);
    await say(trav, convA, 'x'.repeat(2001)).expect(400);
    const bid2 = (await http().get(`/api/trips/${tripId}/post`).set('Cookie', trav)).body.bids[0].id;
    await http().post(`/api/trips/${tripId}/bids/${bid2}/accept`).set('Cookie', trav).expect(201);
    await say(trav, convA, 'You can reach me on 0771234567 or sam@example.com').expect(201); // booked: allowed
    const thread = (await http().get(`/api/conversations/${convA}`).set('Cookie', a)).body.conversation;
    expect(thread).toMatchObject({ viewer: 'PROVIDER', contactAllowed: true, canSend: true });
    expect(thread.counterparty.name).toBe('Samira Tester'); // full name once booked
    expect(thread.bookingId).toBeTruthy();
  });

  it('closes threads for providers who were not chosen', async () => {
    const t = (await http().get(`/api/conversations/${convB}`).set('Cookie', b).expect(200)).body.conversation;
    expect(t).toMatchObject({ canSend: false, counterparty: { name: 'Samira T.' } });
    await say(b, convB, 'Any update?').expect(409);
    await say(trav, convB, 'Sorry, I went with someone else.').expect(409);
    await http().get(`/api/conversations/${convB}`).set('Cookie', trav).expect(200); // still readable
  });

  it('works out how quickly a provider replies', async () => {
    await say(a, convA, 'Yes, 6:30 works for me. See you then!').expect(201); // an answer to the traveller's question
    const p = await prisma.providerProfile.findUniqueOrThrow({ where: { id: providerA } });
    expect(p.responseTimeMin).toBeGreaterThanOrEqual(1);
    expect(p.responseTimeMin).toBeLessThan(5); // everything in this test happens within seconds
  });
});
