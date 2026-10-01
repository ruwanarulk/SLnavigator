import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { adminCookie, cleanupUsers, createApp, PNG, signup, signupProvider, submitProvider } from './helpers';

describe('Provider verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const emails = { guide: `guide-${stamp}@navigator.test`, admin: `admin-${stamp}@navigator.test`, traveller: `trav-${stamp}@navigator.test` };
  const pw = `pw-${stamp}-x`;
  let guide: string;
  let admin: string;
  let providerId: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createApp());
    admin = await adminCookie(app, prisma, emails.admin, pw);
  });

  afterAll(async () => {
    await cleanupUsers(prisma, Object.values(emails));
    await app.close();
  });

  it('registers a guide who is invisible until approved', async () => {
    const r = await signupProvider(app, emails.guide, pw, 'GUIDE', `Kasun Test ${stamp}`);
    guide = r.cookie;
    expect(r.body.role).toBe('GUIDE');
    expect(r.body.provider.verificationStatus).toBe('PENDING');
    providerId = r.body.provider.id;
    const list = (await http().get('/api/providers').expect(200)).body as { id: string }[];
    expect(list.some((p) => p.id === providerId)).toBe(false);
    await http().get('/api/providers/' + r.body.provider.slug).expect(404);
  });

  it('refuses a duplicate email and keeps provider routes provider-only', async () => {
    await http().post('/api/auth/register-provider').send({ email: emails.guide, password: pw, name: 'X', type: 'GUIDE', displayName: 'Dup', city: 'Galle', phone: '0771234567' }).expect(409);
    const trav = await signup(app, emails.traveller, pw);
    await http().get('/api/provider/me').set('Cookie', trav).expect(403);
    await http().get('/api/provider/me').expect(401);
  });

  it('will not submit an incomplete application', async () => {
    const me = (await http().get('/api/provider/me').set('Cookie', guide).expect(200)).body;
    expect(me.state).toBe('DRAFT');
    expect(me.canSubmit).toBe(false);
    expect(me.problems.length).toBeGreaterThan(2);
    await http().post('/api/provider/me/submit').set('Cookie', guide).expect(400);
  });

  it('validates uploads by content, size and type of account', async () => {
    const up = (kind: string, buf: Buffer, name: string) => http().post('/api/provider/me/documents').set('Cookie', guide).field('kind', kind).attach('file', buf, name);
    await up('ID', Buffer.from('this is plain text, not a picture'), 'id.png').expect(400);
    await up('INSURANCE', PNG, 'ins.png').expect(400); // guides don't need insurance
    await up('ID', Buffer.alloc(5 * 1024 * 1024, 1), 'big.png').expect(413);
    const ok = await up('ID', PNG, 'passport.png').expect(200);
    expect(ok.body.documents).toHaveLength(1);
    expect(ok.body.documents[0].data).toBeUndefined();
  });

  it('submits, and the admin queue picks it up', async () => {
    const res = await submitProvider(app, guide).then((r) => r);
    expect(res.status).toBe(200);
    expect(res.body.state).toBe('IN_REVIEW');
    await http().get('/api/admin/verification').set('Cookie', guide).expect(403);
    const queue = (await http().get('/api/admin/verification').set('Cookie', admin).expect(200)).body as { id: string; label: string; docsHave: number; docsNeed: number }[];
    const row = queue.find((q) => q.id === providerId)!;
    expect(row).toMatchObject({ docsHave: 2, docsNeed: 2, label: 'Ready to review' });
    await http().post('/api/provider/me/submit').set('Cookie', guide).expect(400); // already in review
  });

  it('lets only admins read a document, and logs every view', async () => {
    const detail = (await http().get(`/api/admin/verification/${providerId}`).set('Cookie', admin).expect(200)).body;
    const doc = detail.documents.find((d: { kind: string }) => d.kind === 'ID');
    const url = `/api/admin/verification/documents/${doc.id}/file`;
    await http().get(url).set('Cookie', guide).expect(403);
    await http().get(url).expect(401);
    const file = await http().get(url).set('Cookie', admin).expect(200);
    expect(file.headers['content-type']).toContain('image/png');
    expect(file.headers['cache-control']).toContain('no-store');
    const logs = await prisma.auditLog.count({ where: { action: 'document.view', targetId: doc.id } });
    expect(logs).toBe(1);
  });

  it('requests changes with a reason, then approves after a resubmission', async () => {
    await http().post(`/api/admin/verification/${providerId}/decision`).set('Cookie', admin).send({ decision: 'REQUEST_CHANGES' }).expect(400);
    await http().post(`/api/admin/verification/${providerId}/decision`).set('Cookie', admin).send({ decision: 'REQUEST_CHANGES', note: 'Licence photo is blurry, please re-upload' }).expect(201);
    const me = (await http().get('/api/provider/me').set('Cookie', guide).expect(200)).body;
    expect(me).toMatchObject({ state: 'CHANGES_REQUESTED', reviewNote: 'Licence photo is blurry, please re-upload' });
    const resub = await http().post('/api/provider/me/submit').set('Cookie', guide).expect(200);
    expect(resub.body.verificationStatus).toBe('RESUBMITTED');

    const approved = await http().post(`/api/admin/verification/${providerId}/decision`).set('Cookie', admin).send({ decision: 'APPROVE', note: 'Licence checked against SLTDA registry' }).expect(201);
    expect(approved.body.verificationStatus).toBe('APPROVED');
    const note = await prisma.notification.findMany({ where: { user: { email: emails.guide } }, orderBy: { createdAt: 'asc' } });
    expect(note.map((n) => n.type)).toEqual(['provider.changes_requested', 'provider.approved']);
    const audit = await prisma.auditLog.findMany({ where: { targetId: providerId, action: { startsWith: 'provider.' } } });
    expect(audit.map((a) => a.action).sort()).toEqual(['provider.approved', 'provider.changes_requested']);
  });

  it('shows the approved provider in the public directory and locks verified details', async () => {
    const list = (await http().get('/api/providers').expect(200)).body as { id: string }[];
    expect(list.some((p) => p.id === providerId)).toBe(true);
    await http().patch('/api/provider/me').set('Cookie', guide).send({ displayName: 'Someone Else' }).expect(403);
    await http().patch('/api/provider/me').set('Cookie', guide).send({ bio: 'An updated bio that is long enough to count as a real description.' }).expect(200);
    const feed = (await http().get('/api/notifications').set('Cookie', guide).expect(200)).body;
    expect(feed.unread).toBe(2);
    await http().post('/api/notifications/read').set('Cookie', guide).send({}).expect(204);
    expect((await http().get('/api/notifications/summary').set('Cookie', guide)).body.unread).toBe(0);
  });
});
