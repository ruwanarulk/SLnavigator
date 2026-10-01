import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { adminCookie, approveProvider, cleanupUsers, createApp, isoDate, signup, signupProvider } from './helpers';

describe('Reviews and disputes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const pw = `pw-${stamp}-r`;
  const email = (n: string) => `${n}-${stamp}@navigator.test`;
  const emails = ['trav', 'guide', 'other', 'admin'].map(email);
  let trav: string;
  let guide: string;
  let other: string;
  let admin: string;
  let slug: string;
  let tripId: string;
  let postId: string;
  let bookingId: string;
  const locIds: string[] = [];
  const http = () => request(app.getHttpServer());
  const travScores = { punctuality: 5, knowledge: 4, value: 4, safety: 5 };
  const provScores = { clarity: 4, respect: 5, reliability: 3 };
  const url = () => `/api/bookings/${bookingId}/review`;

  /** Moves the trip's dates so its last day was `daysAgo` days ago. */
  const endedDaysAgo = (daysAgo: number) =>
    prisma.tripPost.update({ where: { id: postId }, data: { startDate: new Date(Date.now() - (daysAgo + 3) * 86_400_000), endDate: new Date(Date.now() - daysAgo * 86_400_000) } });

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    for (const [s, name] of [['a', 'Kandy'], ['b', 'Ella']] as const) {
      const l = await prisma.location.create({ data: { slug: `rv-${s}-${stamp}`, name: `${name} ${stamp}`, category: 'town', region: 'hill', lat: s === 'a' ? 7.29 : 6.87, lng: s === 'a' ? 80.63 : 81.05, summary: 's', description: 'd' } });
      locIds.push(l.id);
    }
    trav = await signup(app, emails[0], pw, 'Samira Tester');
    other = await signup(app, emails[2], pw, 'Nosy Parker');
    guide = (await signupProvider(app, emails[1], pw, 'GUIDE', `Review Guide ${stamp}`)).cookie;
    admin = await adminCookie(app, prisma, emails[3], pw);
    const profile = await approveProvider(prisma, emails[1]);
    slug = profile.slug;

    const t = await http().post('/api/trips').set('Cookie', trav).send({ title: 'Review trip', stops: [{ locationId: locIds[0], nights: 2, modeToNext: 'CAR_DRIVER' }, { locationId: locIds[1], nights: 0, modeToNext: 'CAR_DRIVER' }] }).expect(201);
    tripId = t.body.id;
    const post = await http().post(`/api/trips/${tripId}/post`).set('Cookie', trav).send({ startDate: isoDate(30), adults: 2, children: 0, budgetMinUsd: 500, budgetMaxUsd: 1200, need: 'GUIDE_AND_TRANSPORT', interests: [], languages: [], notes: '', deadlineHours: 48 }).expect(201);
    postId = post.body.id;
    const bid = await http().put(`/api/provider/requests/${postId}/bid`).set('Cookie', guide).send({ priceUsd: 800, inclusions: ['GUIDE'], pitch: 'Happy to show you the hills at a gentle pace.', availabilityConfirmed: true }).expect(200);
    bookingId = (await http().post(`/api/trips/${tripId}/bids/${bid.body.id}/accept`).set('Cookie', trav).expect(201)).body.id;
  });

  afterAll(async () => {
    await cleanupUsers(prisma, emails);
    await prisma.location.deleteMany({ where: { id: { in: locIds } } });
    await app.close();
  });

  it('keeps reviews closed until a few days after the trip, and private to the two people on it', async () => {
    const s = (await http().get(url()).set('Cookie', trav).expect(200)).body;
    expect(s.phase).toBe('NOT_YET');
    expect(s.direction).toBe('TRAVELLER_TO_PROVIDER');
    expect(s.criteria.map((c: { id: string }) => c.id)).toEqual(['punctuality', 'knowledge', 'value', 'safety']);
    await http().post(url()).set('Cookie', trav).send({ scores: travScores, recommend: true, text: 'Too early' }).expect(400);
    await http().get(url()).set('Cookie', other).expect(404);
    await http().get(url()).expect(401);
  });

  it('opens three days after the last day and validates the scores', async () => {
    await endedDaysAgo(4);
    expect((await http().get(url()).set('Cookie', trav)).body.phase).toBe('OPEN');
    await http().post(url()).set('Cookie', trav).send({ scores: { punctuality: 5 }, recommend: true, text: 'x' }).expect(400);
    await http().post(url()).set('Cookie', trav).send({ scores: { ...travScores, safety: 6 }, recommend: true, text: 'x' }).expect(400);
    await http().post(url()).set('Cookie', trav).send({ scores: { ...travScores, safety: 4.5 }, recommend: true, text: 'x' }).expect(400);
    await http().post(url()).set('Cookie', other).send({ scores: travScores, recommend: true, text: 'x' }).expect(404);
  });

  it('is blind: a submitted review stays hidden until the other side writes theirs', async () => {
    const res = await http().post(url()).set('Cookie', trav).send({ scores: travScores, recommend: true, text: 'Wonderful, patient and well informed.' }).expect(201);
    expect(res.body.phase).toBe('DONE');
    expect(res.body.mine.overall).toBe(4.5);
    expect(res.body.awaitingOther).toBe(true);
    await http().post(url()).set('Cookie', trav).send({ scores: travScores, recommend: true, text: 'Again' }).expect(409);

    // The guide cannot see it yet, and nothing is public.
    const guideView = (await http().get(url()).set('Cookie', guide).expect(200)).body;
    expect(guideView.direction).toBe('PROVIDER_TO_TRAVELLER');
    expect(guideView.theirs).toBeNull();
    expect(guideView.revealed).toBe(false);
    expect((await http().get(`/api/providers/${slug}/reviews`).expect(200)).body.count).toBe(0);
  });

  it('reveals both once the second arrives, and shows only the traveller review publicly', async () => {
    const res = await http().post(url()).set('Cookie', guide).send({ scores: provScores, recommend: true, text: 'Clear plans and polite guests.' }).expect(201);
    expect(res.body.revealed).toBe(true);
    expect(res.body.theirs.text).toBe('Wonderful, patient and well informed.');

    // The traveller never sees what the provider wrote about them.
    const travView = (await http().get(url()).set('Cookie', trav).expect(200)).body;
    expect(travView.revealed).toBe(true);
    expect(travView.theirs).toBeNull();
    expect(JSON.stringify(travView)).not.toContain('polite guests');

    const pub = (await http().get(`/api/providers/${slug}/reviews`).expect(200)).body;
    expect(pub.count).toBe(1);
    expect(pub.rating).toBe(4.5);
    expect(pub.recommendPct).toBe(100);
    expect(pub.items[0].travellerName).toBe('Samira T.');
    expect(JSON.stringify(pub)).not.toContain('polite guests');
    expect((await prisma.providerProfile.findUniqueOrThrow({ where: { slug } })).reviewCount).toBe(1);
    await http().get('/api/providers/nobody-here/reviews').expect(404);
  });

  it('reveals a lone review once the deadline passes, and closes the window after 30 days', async () => {
    await prisma.review.deleteMany({ where: { bookingId, direction: 'PROVIDER_TO_TRAVELLER' } });
    expect((await http().get(`/api/providers/${slug}/reviews`)).body.count).toBe(0);
    await endedDaysAgo(3 + 1 + 14);
    expect((await http().get(`/api/providers/${slug}/reviews`)).body.count).toBe(1);
    await endedDaysAgo(1 + 3 + 31);
    expect((await http().get(url()).set('Cookie', guide)).body.phase).toBe('CLOSED');
    await http().post(url()).set('Cookie', guide).send({ scores: provScores, recommend: true, text: 'Late' }).expect(400);
  });

  it('sends one review invitation per person, and only with the right secret', async () => {
    await endedDaysAgo(5);
    await prisma.review.deleteMany({ where: { bookingId } });
    await http().get('/api/cron/reminders').expect(404);
    process.env.CRON_SECRET = 'test-secret';
    try {
      await http().get('/api/cron/reminders').set('Authorization', 'Bearer wrong!!!!!').expect(404);
      const first = (await http().get('/api/cron/reminders').set('Authorization', 'Bearer test-secret').expect(200)).body;
      expect(first.sent).toBeGreaterThanOrEqual(2);
      expect((await http().get('/api/cron/reminders').set('Authorization', 'Bearer test-secret').expect(200)).body.sent).toBe(0);
    } finally {
      delete process.env.CRON_SECRET;
    }
    const mine = await prisma.notification.count({ where: { user: { email: { in: [emails[0], emails[1]] } }, type: 'review.request' } });
    expect(mine).toBe(2);
  });

  describe('problem reports', () => {
    let disputeId: string;
    const d = () => `/api/bookings/${bookingId}/disputes`;

    it('lets either person report a problem, and tells the admin and the other side', async () => {
      await http().post(d()).set('Cookie', other).send({ reason: 'NO_SHOW', details: 'Not my booking at all' }).expect(404);
      await http().post(d()).set('Cookie', trav).send({ reason: 'BOGUS', details: 'The guide never turned up on day two.' }).expect(400);
      await http().post(d()).set('Cookie', trav).send({ reason: 'NO_SHOW', details: 'short' }).expect(400);
      const res = await http().post(d()).set('Cookie', trav).send({ reason: 'NO_SHOW', details: 'The guide never turned up on day two.' }).expect(201);
      disputeId = res.body.id;
      await http().post(d()).set('Cookie', trav).send({ reason: 'SERVICE', details: 'Another report on the same booking.' }).expect(409);

      expect(await prisma.notification.count({ where: { user: { email: emails[3] }, type: 'dispute.new' } })).toBe(1);
      expect(await prisma.notification.count({ where: { user: { email: emails[1] }, type: 'dispute.reported' } })).toBe(1);
      const theirs = (await http().get(d()).set('Cookie', guide).expect(200)).body;
      expect(theirs).toHaveLength(1);
      expect(theirs[0].raisedByYou).toBe(false);
      expect(theirs[0].details).toBeNull();
      expect((await http().get(d()).set('Cookie', trav)).body[0].details).toContain('never turned up');
    });

    it('is visible and resolvable by admins only', async () => {
      await http().get('/api/admin/disputes').set('Cookie', trav).expect(403);
      const list = (await http().get('/api/admin/disputes').set('Cookie', admin).expect(200)).body;
      const row = list.find((x: { id: string }) => x.id === disputeId);
      expect(row.raisedBy).toBe('TRAVELLER');
      expect(row.traveller.email).toBe(emails[0]);
      expect(row.provider.email).toBe(emails[1]);

      await http().post(`/api/admin/disputes/${disputeId}/resolve`).set('Cookie', trav).send({ resolution: 'I resolve it myself' }).expect(403);
      await http().post(`/api/admin/disputes/${disputeId}/resolve`).set('Cookie', admin).send({ resolution: 'short' }).expect(400);
      await http().post(`/api/admin/disputes/${disputeId}/resolve`).set('Cookie', admin).send({ resolution: 'Spoke to both; guide confirmed an illness and rebooked the day.' }).expect(200);
      await http().post(`/api/admin/disputes/${disputeId}/resolve`).set('Cookie', admin).send({ resolution: 'Resolving it a second time.' }).expect(409);

      expect((await http().get('/api/admin/disputes').set('Cookie', admin)).body.find((x: { id: string }) => x.id === disputeId)).toBeUndefined();
      expect((await http().get('/api/admin/disputes?status=RESOLVED').set('Cookie', admin)).body.some((x: { id: string }) => x.id === disputeId)).toBe(true);
      expect(await prisma.notification.count({ where: { user: { email: { in: [emails[0], emails[1]] } }, type: 'dispute.resolved' } })).toBe(2);
      expect(await prisma.auditLog.count({ where: { targetId: disputeId, action: 'dispute.resolved' } })).toBe(1);
      expect((await http().get(d()).set('Cookie', guide)).body[0].resolution).toContain('rebooked');
    });
  });
});
