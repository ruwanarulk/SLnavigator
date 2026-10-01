import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Res } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { Authenticated, CurrentUser, type SessionUser } from '../auth/auth.decorators';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { REQUIREMENTS, requiredKinds } from '../provider/requirements';

class DecisionDto {
  @IsIn(['APPROVE', 'REQUEST_CHANGES']) decision: 'APPROVE' | 'REQUEST_CHANGES';
  /** Required when requesting changes; shown to the provider. Optional note on approval stays internal. */
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

class VideoCallDto {
  /** ISO time, or null to clear. */
  @IsOptional() @IsDateString() at?: string | null;
}

const DOC_META = { id: true, kind: true, filename: true, mime: true, size: true, uploadedAt: true } satisfies Prisma.VerificationDocumentSelect;

/** Human-readable review status, as in the mockup's queue. */
function reviewLabel(missing: string[], status: string, videoCallAt: Date | null, note: string | null) {
  if (status === 'REJECTED') return note ? 'Changes requested' : 'Rejected';
  if (missing.length) return `Missing ${missing[0].toLowerCase()}`;
  if (status === 'RESUBMITTED') return 'Resubmitted';
  if (videoCallAt) return 'Video call booked';
  return 'Ready to review';
}

@Controller('admin/verification')
@Authenticated('ADMIN')
export class VerificationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async queue() {
    const rows = await this.prisma.providerProfile.findMany({
      where: { userId: { not: null }, submittedAt: { not: null } },
      include: { documents: { select: DOC_META }, user: { select: { name: true, email: true } } },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map((p) => this.card(p));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const p = await this.prisma.providerProfile.findFirst({
      where: { id, userId: { not: null } },
      include: { documents: { select: DOC_META, orderBy: { uploadedAt: 'asc' } }, user: { select: { name: true, email: true } } },
    });
    if (!p) throw new NotFoundException();
    return { ...this.card(p), bio: p.bio, languages: p.languages, specialties: p.specialties, areas: p.areas, yearsActive: p.yearsActive, phone: p.phone, documents: p.documents, requirements: REQUIREMENTS[p.type] };
  }

  /** Streams a verification document. Admin-only, never cached, and every view is audit-logged. */
  @Get('documents/:docId/file')
  async file(@CurrentUser() admin: SessionUser, @Param('docId') docId: string, @Res() res: Response) {
    const doc = await this.prisma.verificationDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException();
    await this.prisma.auditLog.create({ data: { actorId: admin.id, action: 'document.view', targetType: 'VerificationDocument', targetId: doc.id, notes: `${doc.kind} of provider ${doc.providerId}` } });
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
    res.send(Buffer.from(doc.data));
  }

  @Patch(':id/video-call')
  async videoCall(@CurrentUser() admin: SessionUser, @Param('id') id: string, @Body() dto: VideoCallDto) {
    const p = await this.require(id);
    await this.prisma.providerProfile.update({ where: { id: p.id }, data: { videoCallAt: dto.at ? new Date(dto.at) : null } });
    await this.audit(admin.id, 'provider.video_call', p.id, dto.at ?? 'cleared');
    return this.detail(id);
  }

  @Post(':id/decision')
  async decide(@CurrentUser() admin: SessionUser, @Param('id') id: string, @Body() dto: DecisionDto) {
    const p = await this.prisma.providerProfile.findFirst({ where: { id, userId: { not: null } }, include: { documents: { select: { kind: true } } } });
    if (!p || !p.userId) throw new NotFoundException();
    if (!p.submittedAt) throw new BadRequestException('This application has not been submitted yet');
    if (p.verificationStatus === 'APPROVED') throw new BadRequestException('Already approved');

    if (dto.decision === 'APPROVE') {
      const have = new Set(p.documents.map((d) => d.kind));
      const missing = requiredKinds(p.type).filter((k) => !have.has(k));
      if (missing.length) throw new BadRequestException(`Cannot approve: missing ${missing.join(', ').toLowerCase()}`);
      await this.prisma.providerProfile.update({ where: { id: p.id }, data: { verificationStatus: 'APPROVED', reviewedAt: new Date(), reviewNote: null } });
      await this.audit(admin.id, 'provider.approved', p.id, dto.note);
      await this.notifications.notify({
        userId: p.userId,
        type: 'provider.approved',
        title: 'You are verified',
        body: 'Your profile is approved and visible to travellers. You can now bid on trip requests.',
        link: '/provider/requests',
      });
    } else {
      const note = dto.note?.trim();
      if (!note || note.length < 5) throw new BadRequestException('Tell the provider what to change');
      await this.prisma.providerProfile.update({ where: { id: p.id }, data: { verificationStatus: 'REJECTED', reviewedAt: new Date(), reviewNote: note } });
      await this.audit(admin.id, 'provider.changes_requested', p.id, note);
      await this.notifications.notify({
        userId: p.userId,
        type: 'provider.changes_requested',
        title: 'Changes needed on your application',
        body: note,
        link: '/provider/profile',
      });
    }
    return this.detail(id);
  }

  private card(p: Prisma.ProviderProfileGetPayload<{ include: { documents: { select: typeof DOC_META }; user: { select: { name: true; email: true } } } }>) {
    const have = new Set(p.documents.map((d) => d.kind));
    const need = requiredKinds(p.type);
    const missing = need.filter((k) => !have.has(k));
    return {
      id: p.id,
      displayName: p.displayName,
      contactName: p.user?.name ?? '',
      email: p.user?.email ?? '',
      type: p.type,
      city: p.city,
      licenceNumber: p.licenceNumber,
      businessRegNo: p.businessRegNo,
      submittedAt: p.submittedAt,
      verificationStatus: p.verificationStatus,
      reviewNote: p.reviewNote,
      videoCallAt: p.videoCallAt,
      docsHave: need.length - missing.length,
      docsNeed: need.length,
      label: reviewLabel(missing, p.verificationStatus, p.videoCallAt, p.reviewNote),
    };
  }

  private async require(id: string) {
    const p = await this.prisma.providerProfile.findFirst({ where: { id, userId: { not: null } } });
    if (!p) throw new NotFoundException();
    return p;
  }

  private audit(actorId: string, action: string, targetId: string, notes?: string | null) {
    return this.prisma.auditLog.create({ data: { actorId, action, targetType: 'ProviderProfile', targetId, notes: notes ?? undefined } });
  }
}
