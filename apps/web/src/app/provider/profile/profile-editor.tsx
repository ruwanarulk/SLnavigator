"use client";

import { REGIONS } from "@sln/core";
import clsx from "clsx";
import { AlertTriangle, BadgeCheck, Check, CircleDashed, FileUp, Hourglass, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button, ButtonLink, Card, Chip, DisplayHeading } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import type { ProviderType } from "@/lib/types";

export interface ProviderMe {
  id: string;
  slug: string;
  type: ProviderType;
  displayName: string;
  city: string;
  bio: string;
  languages: string[];
  specialties: string[];
  areas: string[];
  yearsActive: number;
  phone: string | null;
  licenceNumber: string | null;
  businessRegNo: string | null;
  priceFromUsd: number | null;
  priceToUsd: number | null;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMITTED";
  state: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
  submittedAt: string | null;
  reviewNote: string | null;
  videoCallAt: string | null;
  documents: { id: string; kind: string; filename: string; size: number; uploadedAt: string }[];
  requirements: { kind: string; label: string; hint: string; required: boolean }[];
  problems: string[];
  canSubmit: boolean;
}

const LANGUAGES = ["English", "Sinhala", "Tamil", "German", "French", "Chinese", "Russian", "Japanese", "Hindi", "Dutch", "Italian", "Spanish"];
const SPECIALTIES = ["Culture", "Wildlife", "Birding", "Hiking", "Tea country", "Beaches", "Surfing", "Food", "Wellness", "Photography", "Adventure", "Family", "Multi-day", "Airport transfer", "Car & driver"];
const MAX_BYTES = 4 * 1024 * 1024;

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ProfileEditor({ initial }: { initial: ProviderMe }) {
  const [me, setMe] = useState(initial);
  const [form, setForm] = useState({
    displayName: initial.displayName,
    city: initial.city,
    phone: initial.phone ?? "",
    bio: initial.bio,
    languages: initial.languages,
    specialties: initial.specialties,
    areas: initial.areas,
    yearsActive: String(initial.yearsActive || ""),
    licenceNumber: initial.licenceNumber ?? "",
    businessRegNo: initial.businessRegNo ?? "",
    priceFromUsd: initial.priceFromUsd?.toString() ?? "",
    priceToUsd: initial.priceToUsd?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const approved = me.state === "APPROVED";
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const body = () => ({
    ...(approved ? {} : { displayName: form.displayName.trim(), licenceNumber: form.licenceNumber.trim() || undefined, businessRegNo: form.businessRegNo.trim() || undefined }),
    city: form.city.trim(),
    phone: form.phone.trim(),
    bio: form.bio.trim(),
    languages: form.languages,
    specialties: form.specialties,
    areas: form.areas,
    yearsActive: form.yearsActive ? Number(form.yearsActive) : 0,
    priceFromUsd: form.priceFromUsd ? Number(form.priceFromUsd) : undefined,
    priceToUsd: form.priceToUsd ? Number(form.priceToUsd) : undefined,
  });

  async function save(quiet = false) {
    setSaving(true);
    setNotice(null);
    try {
      const next = await api<ProviderMe>("/provider/me", { method: "PATCH", json: body() });
      setMe(next);
      if (!quiet) setNotice({ tone: "ok", text: "Profile saved." });
      return next;
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function upload(kind: string, file: File) {
    setNotice(null);
    if (file.size > MAX_BYTES) return setNotice({ tone: "error", text: "Files must be 4 MB or smaller. Try a smaller photo or a PDF." });
    setUploading(kind);
    try {
      const data = new FormData();
      data.append("kind", kind);
      data.append("file", file);
      const res = await fetch("/api/provider/me/documents", { method: "POST", body: data, credentials: "same-origin" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, Array.isArray(json.message) ? json.message[0] : (json.message ?? "Upload failed"));
      setMe(json as ProviderMe);
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(null);
    }
  }

  async function removeDoc(id: string) {
    try {
      setMe(await api<ProviderMe>(`/provider/me/documents/${id}`, { method: "DELETE" }));
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
    }
  }

  async function submit() {
    const saved = await save(true);
    if (!saved) return;
    if (saved.problems.length) {
      setAttempted(true);
      setNotice({ tone: "error", text: "Almost there. A few things are still missing; see the list below." });
      return;
    }
    try {
      setMe(await api<ProviderMe>("/provider/me/submit", { method: "POST" }));
      setNotice({ tone: "ok", text: "Submitted. We'll review it and email you." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setNotice({ tone: "error", text: (e as Error).message });
    }
  }

  const input = "h-11 w-full rounded-tile border border-sep bg-bg px-3.5 text-[15px] outline-none focus:border-accent disabled:opacity-60";
  const isGuide = me.type === "GUIDE";

  return (
    <div className="space-y-6">
      <div>
        <DisplayHeading as="h1" className="text-[40px]">
          Profile &amp; verification
        </DisplayHeading>
        <p className="text-[14px] text-label2">Travellers only see you after our team has checked your documents.</p>
      </div>

      <StatusBanner me={me} />

      {notice && (
        <p role={notice.tone === "error" ? "alert" : "status"} className={clsx("rounded-tile p-3 text-[14px]", notice.tone === "error" ? "bg-danger-t text-danger" : "bg-ok-t text-ok")}>
          {notice.text}
        </p>
      )}

      <Card className="space-y-5 p-6">
        <h2 className="text-[17px] font-semibold">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label={isGuide ? "Name travellers will see" : "Business name"}>
            <input className={input} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} disabled={approved} maxLength={80} />
          </L>
          <L label="Base town or city">
            <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={60} />
          </L>
          <L label="Phone / WhatsApp (private)">
            <input className={input} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
          </L>
          <L label="Years active">
            <input className={input} type="number" min={0} max={60} value={form.yearsActive} onChange={(e) => set("yearsActive", e.target.value)} />
          </L>
        </div>
        <L label="Bio">
          <textarea
            className={clsx(input, "h-auto min-h-28 py-3")}
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={2000}
            placeholder="Where you grew up, what you love showing travellers, and how you like to run a day."
          />
          <span className="mt-1 block text-right text-[12px] text-label2">{form.bio.trim().length} / 40 minimum</span>
        </L>
        <Group label="Languages you speak">
          {LANGUAGES.map((l) => (
            <Chip key={l} active={form.languages.includes(l)} onClick={() => set("languages", toggle(form.languages, l))}>
              {form.languages.includes(l) && <Check aria-hidden className="size-3.5" />}
              {l}
            </Chip>
          ))}
        </Group>
        <Group label="Regions you cover">
          {REGIONS.map((r) => (
            <Chip key={r.id} active={form.areas.includes(r.id)} onClick={() => set("areas", toggle(form.areas, r.id))}>
              {form.areas.includes(r.id) && <Check aria-hidden className="size-3.5" />}
              {r.label}
            </Chip>
          ))}
        </Group>
        <Group label="Specialties">
          {SPECIALTIES.map((s) => (
            <Chip key={s} active={form.specialties.includes(s)} onClick={() => set("specialties", toggle(form.specialties, s))}>
              {form.specialties.includes(s) && <Check aria-hidden className="size-3.5" />}
              {s}
            </Chip>
          ))}
        </Group>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Typical day rate from (USD)">
            <input className={input} type="number" min={0} value={form.priceFromUsd} onChange={(e) => set("priceFromUsd", e.target.value)} />
          </L>
          <L label="to (USD)">
            <input className={input} type="number" min={0} value={form.priceToUsd} onChange={(e) => set("priceToUsd", e.target.value)} />
          </L>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-[17px] font-semibold">Verification</h2>
        {isGuide ? (
          <L label="SLTDA guide licence number">
            <input className={input} value={form.licenceNumber} onChange={(e) => set("licenceNumber", e.target.value)} disabled={approved} maxLength={60} />
          </L>
        ) : (
          <L label="Business registration number">
            <input className={input} value={form.businessRegNo} onChange={(e) => set("businessRegNo", e.target.value)} disabled={approved} maxLength={60} />
          </L>
        )}
        <p className="text-[13px] text-label2">Documents are private: only our verification team can open them. PDF, JPG, PNG or WebP, up to 4 MB each.</p>
        <ul className="divide-y divide-sep rounded-tile border border-sep">
          {me.requirements.map((r) => (
            <DocRow
              key={r.kind}
              req={r}
              doc={me.documents.find((d) => d.kind === r.kind)}
              busy={uploading === r.kind}
              locked={approved}
              onFile={(f) => upload(r.kind, f)}
              onRemove={removeDoc}
            />
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => save()} disabled={saving}>
          Save Profile
        </Button>
        {!approved && me.state !== "IN_REVIEW" && (
          <Button onClick={submit} disabled={saving}>
            {me.state === "CHANGES_REQUESTED" ? "Resubmit for Review" : "Submit for Review"}
          </Button>
        )}
      </div>
      {!approved && me.state !== "IN_REVIEW" && attempted && me.problems.length > 0 && (
        <div className="rounded-tile bg-fill p-4 text-[13px]">
          <p className="mb-1 font-semibold">Still needed before you can submit:</p>
          <ul className="list-inside list-disc space-y-0.5 text-label2">
            {me.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ me }: { me: ProviderMe }) {
  if (me.state === "APPROVED") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-ok-t p-5 text-ok">
        <p className="flex items-center gap-2 font-semibold">
          <BadgeCheck aria-hidden className="size-5" /> You&apos;re verified and visible to travellers.
        </p>
        <div className="flex gap-2">
          <ButtonLink href="/provider/requests" size="sm">
            See Trip Requests
          </ButtonLink>
          <Link href={`/guides/${me.slug}`} className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold underline underline-offset-4">
            View Public Profile
          </Link>
        </div>
      </div>
    );
  }
  if (me.state === "IN_REVIEW") {
    return (
      <div className="rounded-card bg-signal-t p-5 text-signal-ink">
        <p className="flex items-center gap-2 font-semibold">
          <Hourglass aria-hidden className="size-5" /> In review
        </p>
        <p className="mt-1 text-[14px]">
          Submitted {me.submittedAt ? new Date(me.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}. We check your documents and may book a short video call. You&apos;ll hear from us within two working days.
          {me.videoCallAt && ` Video call: ${new Date(me.videoCallAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`}
        </p>
      </div>
    );
  }
  if (me.state === "CHANGES_REQUESTED") {
    return (
      <div className="rounded-card bg-danger-t p-5 text-danger">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle aria-hidden className="size-5" /> Changes needed
        </p>
        <p className="mt-1 text-[14px] text-label">{me.reviewNote}</p>
      </div>
    );
  }
  return (
    <div className="rounded-card bg-accent-t p-5 text-accent-ink">
      <p className="font-semibold">Finish your profile, upload your documents, then submit for review.</p>
    </div>
  );
}

function DocRow({
  req,
  doc,
  busy,
  locked,
  onFile,
  onRemove,
}: {
  req: ProviderMe["requirements"][number];
  doc?: ProviderMe["documents"][number];
  busy: boolean;
  locked: boolean;
  onFile: (f: File) => void;
  onRemove: (id: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      {doc ? <Check aria-hidden className="size-5 shrink-0 text-ok" /> : <CircleDashed aria-hidden className="size-5 shrink-0 text-label2" />}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">
          {req.label} {!req.required && <span className="text-[12px] font-normal text-label2">(optional)</span>}
        </p>
        <p className="truncate text-[12px] text-label2">{doc ? `${doc.filename} · ${kb(doc.size)}` : req.hint}</p>
      </div>
      {!locked && (
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={`Upload ${req.label}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => ref.current?.click()}>
            <FileUp className="size-4" /> {busy ? "Uploading…" : doc ? "Replace" : "Upload"}
          </Button>
          {doc && (
            <button aria-label={`Remove ${req.label}`} onClick={() => onRemove(doc.id)} className="grid size-8 place-items-center rounded-full text-label2 hover:bg-danger-t hover:text-danger">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
    </label>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
