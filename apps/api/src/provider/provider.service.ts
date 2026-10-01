import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_DOC_BYTES, profileProblems, REQUIREMENTS, requiredKinds, sniffMime } from './requirements';

const DOC_META = { id: true, kind: true, filename: true, mime: true, size: true, uploadedAt: true } satisfies Prisma.VerificationDocumentSelect;

export function slugify(name: string) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'provider';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async profileFor(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId }, include: { documents: { select: DOC_META, orderBy: { uploadedAt: 'asc' } } } });
    if (!profile) throw new NotFoundException('No provider profile for this account');
    return profile;
  }

  /** Everything the onboarding screen needs in one response. */
  async me(userId: string) {
    const p = await this.profileFor(userId);
    const have = new Set(p.documents.map((d) => d.kind));
    const missingDocs = requiredKinds(p.type).filter((k) => !have.has(k));
    const problems = [...profileProblems(p), ...missingDocs.map((k) => `Upload: ${REQUIREMENTS[p.type].find((r) => r.kind === k)!.label}`)];
    const state = p.verificationStatus === 'APPROVED' ? 'APPROVED' : p.verificationStatus === 'REJECTED' ? 'CHANGES_REQUESTED' : p.submittedAt ? 'IN_REVIEW' : 'DRAFT';
    return {
      id: p.id,
      slug: p.slug,
      type: p.type,
      displayName: p.displayName,
      city: p.city,
      bio: p.bio,
      languages: p.languages,
      specialties: p.specialties,
      areas: p.areas,
      yearsActive: p.yearsActive,
      phone: p.phone,
      licenceNumber: p.licenceNumber,
      businessRegNo: p.businessRegNo,
      priceFromUsd: p.priceFromUsd,
      priceToUsd: p.priceToUsd,
      verificationStatus: p.verificationStatus,
      state,
      submittedAt: p.submittedAt,
      reviewNote: p.reviewNote,
      videoCallAt: p.videoCallAt,
      documents: p.documents,
      requirements: REQUIREMENTS[p.type],
      problems,
      canSubmit: problems.length === 0 && state !== 'APPROVED' && state !== 'IN_REVIEW',
    };
  }

  async update(userId: string, data: Prisma.ProviderProfileUpdateInput) {
    const p = await this.profileFor(userId);
    const touchesIdentity = data.displayName !== undefined || data.licenceNumber !== undefined || data.businessRegNo !== undefined;
    if (p.verificationStatus === 'APPROVED' && touchesIdentity) {
      throw new ForbiddenException('Your name and registration details are verified. Contact support to change them.');
    }
    await this.prisma.providerProfile.update({ where: { id: p.id }, data });
    return this.me(userId);
  }

  async upload(userId: string, kind: DocumentKind, file: { originalname: string; buffer: Buffer; size: number } | undefined) {
    const p = await this.profileFor(userId);
    if (!file) throw new BadRequestException('Choose a file to upload');
    if (p.verificationStatus === 'APPROVED') throw new ForbiddenException('Your profile is already verified');
    if (!REQUIREMENTS[p.type].some((r) => r.kind === kind)) throw new BadRequestException('That document is not needed for your account type');
    if (file.size > MAX_DOC_BYTES) throw new BadRequestException('Files must be 4 MB or smaller');
    const mime = sniffMime(file.buffer);
    if (!mime) throw new BadRequestException('Upload a PDF, JPG, PNG or WebP file');
    const data = Uint8Array.from(file.buffer);
    const filename = file.originalname.replace(/[^\w.\- ()]/g, '_').slice(-120) || 'document';
    await this.prisma.verificationDocument.upsert({
      where: { providerId_kind: { providerId: p.id, kind } },
      update: { filename, mime, size: file.size, data, uploadedAt: new Date() },
      create: { providerId: p.id, kind, filename, mime, size: file.size, data },
    });
    return this.me(userId);
  }

  async removeDocument(userId: string, id: string) {
    const p = await this.profileFor(userId);
    if (p.verificationStatus === 'APPROVED') throw new ForbiddenException('Your profile is already verified');
    const r = await this.prisma.verificationDocument.deleteMany({ where: { id, providerId: p.id } });
    if (!r.count) throw new NotFoundException();
    return this.me(userId);
  }

  async submit(userId: string) {
    const me = await this.me(userId);
    if (me.state === 'APPROVED') throw new BadRequestException('Already verified');
    if (me.state === 'IN_REVIEW') throw new BadRequestException('Your application is already in review');
    if (me.problems.length) throw new BadRequestException(me.problems[0]);
    await this.prisma.providerProfile.update({
      where: { id: me.id },
      data: { submittedAt: new Date(), verificationStatus: me.state === 'CHANGES_REQUESTED' ? 'RESUBMITTED' : 'PENDING' },
    });
    return this.me(userId);
  }
}
