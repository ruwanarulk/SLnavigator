"use client";

import { REGIONS } from "@sln/core";
import clsx from "clsx";
import { useState, type FormEvent } from "react";
import { Button, Card, DisplayHeading, Pill } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { VerificationQueue } from "./verification-queue";

interface AdminProvider {
  id: string;
  slug: string;
  type: "GUIDE" | "COMPANY" | "TRANSPORT";
  displayName: string;
  city: string;
  bio: string;
  languages: string[];
  specialties: string[];
  areas: string[];
  yearsActive: number;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "RESUBMITTED";
  priceFromUsd: number | null;
  priceToUsd: number | null;
  isSample: boolean;
  updatedAt: string;
}

interface AdminLocation {
  id: string;
  slug: string;
  name: string;
  region: string;
  entryFeeUsd: number;
  openingHours: string | null;
  verifiedAt: string | null;
}

const STATUS_TONE = { PENDING: "signal", APPROVED: "ok", REJECTED: "danger", RESUBMITTED: "accent" } as const;

export function AdminConsole({ providers: initialProviders, locations: initialLocations }: { providers: AdminProvider[]; locations: AdminLocation[] }) {
  const [tab, setTab] = useState<"verification" | "providers" | "locations">("verification");
  const [providers, setProviders] = useState(initialProviders);
  const [locations, setLocations] = useState(initialLocations);
  const [editing, setEditing] = useState<AdminProvider | "new" | null>(null);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 md:px-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-label2">Admin · Operations</p>
      <DisplayHeading as="h1" className="mt-1 text-[44px]">
        {tab === "verification" ? "Verification queue" : tab === "providers" ? "Provider directory" : "Location facts"}
      </DisplayHeading>
      <p className="text-[14px] text-label2">
        {tab === "verification"
          ? "Pending accounts are invisible to travellers until approved. Every decision is written to the audit log."
          : tab === "providers"
          ? "Phase 1: profiles are entered by the team. Pending profiles stay invisible to travellers until approved. Every change is written to the audit log."
          : "Check fees and hours against an official source, then mark as verified."}
      </p>

      <div role="tablist" className="mt-5 inline-grid grid-cols-3 rounded-full bg-fill p-1">
        {(["verification", "providers", "locations"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("h-9 rounded-full px-5 text-[14px] font-medium capitalize", tab === t ? "bg-card shadow-sm" : "text-label2")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "verification" ? (
        <VerificationQueue />
      ) : tab === "providers" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-x-auto p-2">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[11px] uppercase tracking-wider text-label2">
                <tr>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">City</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setEditing(p)}
                    className={clsx("cursor-pointer border-t border-sep hover:bg-fill", editing !== "new" && editing?.id === p.id && "bg-accent-t")}
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {p.displayName} {p.isSample && <Pill tone="signal">Sample</Pill>}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-label2">{p.type.toLowerCase()}</td>
                    <td className="px-3 py-2.5 text-label2">{p.city}</td>
                    <td className="px-3 py-2.5">
                      <Pill tone={STATUS_TONE[p.verificationStatus]}>{p.verificationStatus.toLowerCase()}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3">
              <Button size="sm" onClick={() => setEditing("new")}>
                Add Provider
              </Button>
            </div>
          </Card>
          {editing && (
            <ProviderForm
              key={editing === "new" ? "new" : editing.id}
              provider={editing === "new" ? null : editing}
              onSaved={(p) => {
                setProviders((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list]));
                setEditing(p);
              }}
            />
          )}
        </div>
      ) : (
        <Card className="mt-6 overflow-x-auto p-2">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[11px] uppercase tracking-wider text-label2">
              <tr>
                <th className="px-3 py-2 font-semibold">Place</th>
                <th className="px-3 py-2 font-semibold">Entry fee (USD)</th>
                <th className="px-3 py-2 font-semibold">Hours</th>
                <th className="px-3 py-2 font-semibold">Verified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <LocationRow key={l.id} loc={l} onSaved={(u) => setLocations((all) => all.map((x) => (x.id === u.id ? u : x)))} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ProviderForm({ provider, onSaved }: { provider: AdminProvider | null; onSaved: (p: AdminProvider) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const list = (k: string) => String(f.get(k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const num = (k: string) => (f.get(k) ? Number(f.get(k)) : undefined);
    const body = {
      slug: String(f.get("slug")),
      type: f.get("type"),
      displayName: f.get("displayName"),
      city: f.get("city"),
      bio: f.get("bio"),
      languages: list("languages"),
      specialties: list("specialties"),
      areas: f.getAll("areas"),
      yearsActive: num("yearsActive"),
      priceFromUsd: num("priceFromUsd"),
      priceToUsd: num("priceToUsd"),
      verificationStatus: f.get("verificationStatus"),
      isSample: f.get("isSample") === "on",
      note: f.get("note") || undefined,
    };
    setBusy(true);
    setError(null);
    try {
      const saved = provider
        ? await api<AdminProvider>(`/admin/providers/${provider.id}`, { method: "PATCH", json: body })
        : await api<AdminProvider>("/admin/providers", { method: "POST", json: body });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-10 w-full rounded-tile border border-sep bg-bg px-3 text-[14px] outline-none focus:border-accent";
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-[17px] font-semibold">{provider ? `Edit ${provider.displayName}` : "New provider"}</h2>
      <form onSubmit={submit} className="grid gap-3 text-[13px]">
        <div className="grid grid-cols-2 gap-3">
          <L label="Display name"><input name="displayName" required defaultValue={provider?.displayName} className={input} /></L>
          <L label="URL slug"><input name="slug" required pattern="[a-z0-9-]{3,60}" defaultValue={provider?.slug} className={input} /></L>
          <L label="Type">
            <select name="type" defaultValue={provider?.type ?? "GUIDE"} className={input}>
              <option value="GUIDE">Guide</option>
              <option value="COMPANY">Company</option>
              <option value="TRANSPORT">Transport</option>
            </select>
          </L>
          <L label="City"><input name="city" required defaultValue={provider?.city} className={input} /></L>
        </div>
        <L label="Bio"><textarea name="bio" required rows={3} defaultValue={provider?.bio} className={`${input} h-auto py-2`} /></L>
        <L label="Languages (comma separated)"><input name="languages" defaultValue={provider?.languages.join(", ")} className={input} /></L>
        <L label="Specialties (comma separated)"><input name="specialties" defaultValue={provider?.specialties.join(", ")} className={input} /></L>
        <fieldset>
          <legend className="mb-1 font-medium">Areas covered</legend>
          <div className="flex flex-wrap gap-3">
            {REGIONS.map((r) => (
              <label key={r.id} className="flex items-center gap-1.5">
                <input type="checkbox" name="areas" value={r.id} defaultChecked={provider?.areas.includes(r.id)} /> {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-3 gap-3">
          <L label="Years active"><input name="yearsActive" type="number" min={0} defaultValue={provider?.yearsActive} className={input} /></L>
          <L label="Day rate from $"><input name="priceFromUsd" type="number" min={0} defaultValue={provider?.priceFromUsd ?? undefined} className={input} /></L>
          <L label="to $"><input name="priceToUsd" type="number" min={0} defaultValue={provider?.priceToUsd ?? undefined} className={input} /></L>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <L label="Verification">
            <select name="verificationStatus" defaultValue={provider?.verificationStatus ?? "PENDING"} className={input}>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved (visible)</option>
              <option value="REJECTED">Rejected</option>
              <option value="RESUBMITTED">Resubmitted</option>
            </select>
          </L>
          <label className="flex h-10 items-center gap-2">
            <input type="checkbox" name="isSample" defaultChecked={provider?.isSample} /> Sample / demo data
          </label>
        </div>
        <L label="Reviewer note (audit log)">
          <input name="note" placeholder="e.g. SLTDA licence checked against registry" className={input} />
        </L>
        <p className="rounded-tile bg-signal-t p-2.5 text-signal-ink">Check the licence number against the SLTDA registry before approving.</p>
        {error && <p role="alert" className="rounded-tile bg-danger-t p-2.5 text-danger">{error}</p>}
        <Button type="submit" disabled={busy}>{provider ? "Save Changes" : "Create Provider"}</Button>
      </form>
    </Card>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function LocationRow({ loc, onSaved }: { loc: AdminLocation; onSaved: (l: AdminLocation) => void }) {
  const [fee, setFee] = useState(String(loc.entryFeeUsd));
  const [hours, setHours] = useState(loc.openingHours ?? "");
  const [busy, setBusy] = useState(false);

  async function save(markVerified: boolean) {
    setBusy(true);
    try {
      onSaved(await api<AdminLocation>(`/admin/locations/${loc.id}`, { method: "PATCH", json: { entryFeeUsd: Number(fee), openingHours: hours || undefined, markVerified } }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-sep">
      <td className="px-3 py-2 font-medium">{loc.name}</td>
      <td className="px-3 py-2">
        <input aria-label={`Entry fee for ${loc.name}`} type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="h-9 w-20 rounded-md border border-sep bg-bg px-2" />
      </td>
      <td className="px-3 py-2">
        <input aria-label={`Opening hours for ${loc.name}`} value={hours} onChange={(e) => setHours(e.target.value)} className="h-9 w-36 rounded-md border border-sep bg-bg px-2" />
      </td>
      <td className="px-3 py-2 text-label2">{loc.verifiedAt ? new Date(loc.verifiedAt).toLocaleDateString("en-GB") : <Pill tone="signal">Unverified</Pill>}</td>
      <td className="space-x-1 whitespace-nowrap px-3 py-2 text-right">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(false)}>Save</Button>
        <Button size="sm" disabled={busy} onClick={() => save(true)}>Save &amp; Verify</Button>
      </td>
    </tr>
  );
}

export { REGIONS };
