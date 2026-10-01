import type { DocumentKind, ProviderProfile, ProviderType } from '@prisma/client';

export interface DocRequirement {
  kind: DocumentKind;
  label: string;
  hint: string;
  required: boolean;
}

const ID: DocRequirement = { kind: 'ID', label: 'Passport or national ID', hint: 'Clear photo or scan of the photo page. For a company: a director.', required: true };
const LICENCE: DocRequirement = { kind: 'LICENCE', label: 'SLTDA guide licence', hint: 'Your Sri Lanka Tourism Development Authority licence, front and back if needed.', required: true };
const BUSINESS: DocRequirement = { kind: 'BUSINESS_REG', label: 'Business registration', hint: 'Company or business registration certificate (vehicle registration papers for drivers).', required: true };
const INSURANCE: DocRequirement = { kind: 'INSURANCE', label: 'Insurance certificate', hint: 'Valid public liability or passenger insurance covering the vehicles and guests.', required: true };
const PHOTO: DocRequirement = { kind: 'PHOTO', label: 'Profile photo', hint: 'Optional. A friendly photo travellers will see on your profile.', required: false };

export const REQUIREMENTS: Record<ProviderType, DocRequirement[]> = {
  GUIDE: [ID, LICENCE, PHOTO],
  COMPANY: [ID, BUSINESS, INSURANCE, PHOTO],
  TRANSPORT: [ID, BUSINESS, INSURANCE, PHOTO],
};

export const requiredKinds = (type: ProviderType) => REQUIREMENTS[type].filter((r) => r.required).map((r) => r.kind);

/** What is still missing from the written profile before it can be submitted. */
export function profileProblems(p: Pick<ProviderProfile, 'type' | 'bio' | 'languages' | 'areas' | 'phone' | 'licenceNumber' | 'businessRegNo' | 'city'>): string[] {
  const out: string[] = [];
  if (!p.city.trim()) out.push('Add your base town or city');
  if (!p.phone?.trim()) out.push('Add a phone number (kept private, used only by our team)');
  if (p.bio.trim().length < 40) out.push('Write a short bio of at least 40 characters');
  if (p.languages.length === 0) out.push('List at least one language you speak');
  if (p.areas.length === 0) out.push('Choose at least one region you cover');
  if (p.type === 'GUIDE' && !p.licenceNumber?.trim()) out.push('Enter your SLTDA licence number');
  if (p.type !== 'GUIDE' && !p.businessRegNo?.trim()) out.push('Enter your business registration number');
  return out;
}

/** Identifies an upload by its first bytes so a renamed file can't masquerade as an image or PDF. */
export function sniffMime(buf: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export const MAX_DOC_BYTES = 4 * 1024 * 1024;
