"use client";

import { REGIONS } from "@sln/core";
import clsx from "clsx";
import { AlertTriangle, BadgeCheck, CalendarClock, Check, Clock, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Pill } from "@/components/ui/primitives";
import { api } from "@/lib/api";

interface QueueRow {
  id: string;
  displayName: string;
  contactName: string;
  email: string;
  type: "GUIDE" | "COMPANY" | "TRANSPORT";
  city: string;
  licenceNumber: string | null;
  businessRegNo: string | null;
  submittedAt: string;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMITTED";
  reviewNote: string | null;
  videoCallAt: string | null;
  docsHave: number;
  docsNeed: number;
  label: string;
}

interface Detail extends QueueRow {
  bio: string;
  languages: string[];
  specialties: string[];
  areas: string[];
  yearsActive: number;
  phone: string | null;
  documents: { id: string; kind: string; filename: string; size: number; uploadedAt: string }[];
  requirements: { kind: string; label: string; required: boolean }[];
}

type Filter = "PENDING" | "RESUBMITTED" | "REJECTED" | "APPROVED";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "PENDING", label: "Pending" },
  { id: "RESUBMITTED", label: "Resubmitted" },
  { id: "REJECTED", label: "Changes requested" },
  { id: "APPROVED", label: "Approved" },
];
const TYPE_LABEL = { GUIDE: "Guide", COMPANY: "Company", TRANSPORT: "Transport" } as const;

const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "1 d ago" : `${d} d ago`;
}
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function chipTone(r: QueueRow) {
  if (r.verificationStatus === "APPROVED") return "ok" as const;
  if (r.verificationStatus === "REJECTED") return "danger" as const;
  if (r.docsHave < r.docsNeed) return "danger" as const;
  if (r.verificationStatus === "RESUBMITTED") return "accent" as const;
  return r.videoCallAt ? ("accent" as const) : ("signal" as const);
}

export function VerificationQueue() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api<QueueRow[]>("/admin/verification")
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    let alive = true;
    api<QueueRow[]>("/admin/verification")
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, (rows ?? []).filter((r) => r.verificationStatus === f.id).length])) as Record<Filter, number>, [rows]);
  const shown = (rows ?? []).filter((r) => r.verificationStatus === filter);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Application status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={clsx("h-9 rounded-full px-4 text-[13px] font-medium", filter === f.id ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-sep")}
            >
              {f.label} · {counts[f.id] ?? 0}
            </button>
          ))}
        </div>
        <Card className="overflow-x-auto p-2">
          {error && <p className="p-4 text-danger">{error}</p>}
          {rows === null && !error && <p className="p-4 text-label2">Loading…</p>}
          {rows && shown.length === 0 && <p className="p-6 text-center text-label2">No applications here.</p>}
          {shown.length > 0 && (
            <table className="w-full text-left text-[14px]">
              <thead className="text-[11px] uppercase tracking-wider text-label2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Applicant</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Area</th>
                  <th className="px-3 py-2 font-semibold">Submitted</th>
                  <th className="px-3 py-2 font-semibold">Docs</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    tabIndex={0}
                    onClick={() => setSelected(r.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelected(r.id)}
                    className={clsx("cursor-pointer border-t border-sep hover:bg-fill", selected === r.id && "bg-accent-t")}
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent-t text-[12px] font-semibold text-accent-ink">
                          {initials(r.displayName)}
                        </span>
                        <span className="font-medium">{r.displayName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-label2">{TYPE_LABEL[r.type]}</td>
                    <td className="px-3 py-2.5 text-label2">{r.city}</td>
                    <td className="px-3 py-2.5 text-label2">{ago(r.submittedAt)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-label2">
                      {r.docsHave}/{r.docsNeed}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill tone={chipTone(r)}>{r.label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {selected ? <DetailPanel key={selected} id={selected} onChanged={reload} /> : <Card className="hidden p-8 text-center text-label2 lg:block">Select an applicant to review their documents.</Card>}
    </div>
  );
}

function DetailPanel({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [call, setCall] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<Detail>(`/admin/verification/${id}`)
      .then((x) => {
        setD(x);
        setCall(toLocalInput(x.videoCallAt));
      })
      .catch((e) => setMsg({ tone: "error", text: (e as Error).message }));
  }, [id]);

  async function decide(decision: "APPROVE" | "REQUEST_CHANGES") {
    setBusy(true);
    setMsg(null);
    try {
      const next = await api<Detail>(`/admin/verification/${id}/decision`, { method: "POST", json: { decision, note: note.trim() || undefined } });
      setD(next);
      setNote("");
      setMsg({ tone: "ok", text: decision === "APPROVE" ? "Approved. The provider is now visible to travellers." : "Changes requested. The provider has been notified." });
      onChanged();
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function saveCall() {
    try {
      setD(await api<Detail>(`/admin/verification/${id}/video-call`, { method: "PATCH", json: { at: call ? new Date(call).toISOString() : null } }));
      onChanged();
      setMsg({ tone: "ok", text: call ? "Video call saved." : "Video call cleared." });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }

  if (!d) return <Card className="p-6 text-label2">{msg ? msg.text : "Loading…"}</Card>;
  const areas = d.areas.map((a) => REGIONS.find((r) => r.id === a)?.label ?? a).join(", ");
  const final = d.verificationStatus === "APPROVED";

  return (
    <Card className="space-y-4 p-5 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-12 place-items-center rounded-full bg-accent-t font-semibold text-accent-ink">
          {initials(d.displayName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{d.displayName}</p>
          <p className="text-[12px] text-label2">
            {TYPE_LABEL[d.type]} · {d.city} · {d.languages.join(", ")}
          </p>
        </div>
      </div>
      <p className="text-[13px] text-label2">
        {d.contactName} · {d.email}
        {d.phone ? ` · ${d.phone}` : ""} · covers {areas || "no regions"}
      </p>
      <p className="line-clamp-4 text-[13px]">{d.bio}</p>

      <ul className="divide-y divide-sep rounded-tile border border-sep text-[14px]">
        {d.requirements.map((r) => {
          const doc = d.documents.find((x) => x.kind === r.kind);
          return (
            <li key={r.kind} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="flex items-center gap-2">
                {doc ? <Check aria-hidden className="size-4 text-ok" /> : <AlertTriangle aria-hidden className={clsx("size-4", r.required ? "text-danger" : "text-label2")} />}
                {r.label}
              </span>
              {doc ? (
                <a href={`/api/admin/verification/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-ink underline underline-offset-4">
                  View <ExternalLink aria-hidden className="size-3" />
                </a>
              ) : (
                <span className="text-[12px] text-label2">{r.required ? "Missing" : "Not provided"}</span>
              )}
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="flex items-center gap-2">
            <Clock aria-hidden className="size-4 text-label2" /> Registration number
          </span>
          <span className="font-mono text-[13px]">{(d.type === "GUIDE" ? d.licenceNumber : d.businessRegNo) || "none"}</span>
        </li>
      </ul>

      {!final && (
        <div className="flex gap-2 rounded-tile bg-signal-t p-3 text-[13px] text-signal-ink">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          {d.type === "GUIDE" ? "Check the licence number against the SLTDA registry before approving." : "Check the registration number against the official register before approving."} Every decision is written to the audit log.
        </div>
      )}

      {!final && (
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[13px]">
            <span className="mb-1 flex items-center gap-1.5 font-medium">
              <CalendarClock aria-hidden className="size-4" /> Video call
            </span>
            <input type="datetime-local" value={call} onChange={(e) => setCall(e.target.value)} className="h-10 w-full rounded-tile border border-sep bg-bg px-3" />
          </label>
          <Button size="sm" variant="secondary" onClick={saveCall}>
            Save
          </Button>
        </div>
      )}

      {d.reviewNote && d.verificationStatus === "REJECTED" && <p className="rounded-tile bg-danger-t p-3 text-[13px] text-danger">Requested: {d.reviewNote}</p>}

      {final ? (
        <p className="flex items-center gap-2 rounded-tile bg-ok-t p-3 text-[14px] font-medium text-ok">
          <BadgeCheck aria-hidden className="size-4" /> Approved and visible to travellers
        </p>
      ) : (
        <>
          <label className="block text-[13px]">
            <span className="mb-1 block font-medium">Reviewer note (sent to the provider if you request changes)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-tile border border-sep bg-bg px-3 py-2 text-[14px] outline-none focus:border-accent" placeholder="e.g. The licence photo is cut off, please re-upload the full page." />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => decide("APPROVE")} disabled={busy || d.docsHave < d.docsNeed}>
              Approve and Show Badge
            </Button>
            <Button variant="secondary" onClick={() => decide("REQUEST_CHANGES")} disabled={busy || note.trim().length < 5}>
              Request Changes
            </Button>
          </div>
        </>
      )}
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={clsx("rounded-tile p-3 text-[13px]", msg.tone === "error" ? "bg-danger-t text-danger" : "bg-ok-t text-ok")}>
          {msg.text}
        </p>
      )}
    </Card>
  );
}
