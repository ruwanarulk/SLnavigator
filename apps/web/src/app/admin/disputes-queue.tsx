"use client";

import { DISPUTE_REASONS } from "@sln/core";
import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fmtRange } from "@/components/marketplace/shared";
import { Button, Card, Pill } from "@/components/ui/primitives";
import { api } from "@/lib/api";

interface AdminDispute {
  id: string;
  bookingId: string;
  status: "OPEN" | "RESOLVED";
  reason: string;
  details: string;
  createdAt: string;
  raisedBy: "TRAVELLER" | "PROVIDER";
  resolution: string | null;
  resolvedAt: string | null;
  bookingStatus: string;
  tripTitle: string;
  startDate: string | null;
  endDate: string | null;
  priceUsd: number;
  traveller: { name: string; email: string };
  provider: { name: string; phone: string | null; email: string | null };
}

const reasonLabel = (id: string) => DISPUTE_REASONS.find((r) => r.id === id)?.label ?? id;
const field = "w-full rounded-tile border border-sep bg-bg px-3.5 py-3 text-[14px] outline-none focus:border-accent";

/** Reports from travellers and providers. Admins read both sides, talk to them, then record a decision. */
export function DisputesQueue() {
  const [status, setStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [items, setItems] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (s: "OPEN" | "RESOLVED") =>
      api<AdminDispute[]>(`/admin/disputes?status=${s}`).then(
        (rows) => {
          setItems(rows);
          setError(null);
        },
        (e: Error) => setError(e.message),
      ),
    [],
  );
  useEffect(() => {
    void load(status);
  }, [status, load]);

  return (
    <div className="mt-6 space-y-4">
      <div role="tablist" className="inline-grid grid-cols-2 rounded-full bg-fill p-1">
        {(["OPEN", "RESOLVED"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => {
              setItems(null);
              setStatus(s);
            }}
            className={clsx("h-9 rounded-full px-5 text-[14px] font-medium", status === s ? "bg-card shadow-sm" : "text-label2")}
          >
            {s === "OPEN" ? "Open" : "Resolved"}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-tile bg-danger-t p-3 text-[14px] text-danger">
          {error}
        </p>
      )}
      {items === null && !error && <p className="text-[14px] text-label2">Loading…</p>}
      {items?.length === 0 && <Card className="p-8 text-center text-[14px] text-label2">{status === "OPEN" ? "No open reports." : "Nothing resolved yet."}</Card>}
      {items?.map((d) => (
        <DisputeCard key={d.id} d={d} onResolved={() => load(status)} />
      ))}
    </div>
  );
}

function DisputeCard({ d, onResolved }: { d: AdminDispute; onResolved: () => void }) {
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/disputes/${d.id}/resolve`, { method: "POST", json: { resolution } });
      onResolved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{d.tripTitle}</p>
          <p className="text-[13px] text-label2">
            {d.startDate && d.endDate ? `${fmtRange(d.startDate, d.endDate)} · ` : ""}${d.priceUsd.toLocaleString("en-US")} · booking {d.bookingStatus.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Pill tone="signal">{reasonLabel(d.reason)}</Pill>
          <Pill tone={d.status === "OPEN" ? "danger" : "ok"}>{d.status === "OPEN" ? "Open" : "Resolved"}</Pill>
        </div>
      </div>
      <div className="grid gap-3 text-[13px] sm:grid-cols-2">
        <div className="rounded-tile bg-fill p-3">
          <p className="text-label2">Traveller{d.raisedBy === "TRAVELLER" && " · reported"}</p>
          <p className="font-medium">{d.traveller.name}</p>
          <a href={`mailto:${d.traveller.email}`} className="text-accent-ink">
            {d.traveller.email}
          </a>
        </div>
        <div className="rounded-tile bg-fill p-3">
          <p className="text-label2">Provider{d.raisedBy === "PROVIDER" && " · reported"}</p>
          <p className="font-medium">{d.provider.name}</p>
          {d.provider.email && (
            <a href={`mailto:${d.provider.email}`} className="block text-accent-ink">
              {d.provider.email}
            </a>
          )}
          {d.provider.phone && <p>{d.provider.phone}</p>}
        </div>
      </div>
      <p className="text-[14px] leading-relaxed">&ldquo;{d.details}&rdquo;</p>
      <p className="text-[12px] text-label2">
        Reported {new Date(d.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
        <Link href={`/bookings/${d.bookingId}`} className="text-accent-ink">
          open booking
        </Link>
      </p>
      {d.status === "RESOLVED" ? (
        <p className="rounded-tile bg-ok-t p-3 text-[14px] text-ok">
          <span className="font-medium">Decision: </span>
          {d.resolution}
        </p>
      ) : (
        <div className="space-y-2 border-t border-sep pt-3">
          <textarea className={field} rows={3} maxLength={1500} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="What was decided? Both people see this." aria-label="Resolution" />
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button size="sm" onClick={resolve} disabled={busy || resolution.trim().length < 10}>
            {busy ? "Saving…" : "Mark Resolved"}
          </Button>
        </div>
      )}
    </Card>
  );
}
