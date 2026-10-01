"use client";

import { DISPUTE_REASONS } from "@sln/core";
import { Flag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Dialog } from "../ui/dialog";
import { Button, Pill } from "../ui/primitives";
import { fmtDate } from "../marketplace/shared";

interface DisputeItem {
  id: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  raisedByYou: boolean;
  details: string | null;
  resolution: string | null;
}

const reasonLabel = (id: string) => DISPUTE_REASONS.find((r) => r.id === id)?.label ?? id;
const field = "w-full rounded-tile border border-sep bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-accent";

/** "Report a problem" with its history. A person at Navigator reads every report. */
export function ReportProblem({ bookingId }: { bookingId: string }) {
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(DISPUTE_REASONS[0].id);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<DisputeItem[]>(`/bookings/${bookingId}/disputes`).then(setItems, () => undefined), [bookingId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${bookingId}/disputes`, { method: "POST", json: { reason, details } });
      setOpen(false);
      setDetails("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const hasOpen = items.some((d) => d.status === "OPEN" && d.raisedByYou);

  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.id} className="rounded-tile bg-fill p-4 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">
              {d.raisedByYou ? "You reported" : "Reported by the other person"}: {reasonLabel(d.reason).toLowerCase()}
            </p>
            <Pill tone={d.status === "OPEN" ? "signal" : "ok"}>{d.status === "OPEN" ? "Under review" : "Resolved"}</Pill>
          </div>
          <p className="mt-0.5 text-label2">{fmtDate(d.createdAt, { day: "numeric", month: "short", year: "numeric" })}</p>
          {d.details && <p className="mt-2">&ldquo;{d.details}&rdquo;</p>}
          {d.resolution && (
            <p className="mt-2 rounded-md bg-card p-2.5">
              <span className="font-medium">Our decision: </span>
              {d.resolution}
            </p>
          )}
        </div>
      ))}
      {!hasOpen && (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Flag className="size-4" /> Report a problem
        </Button>
      )}

      <Dialog open={open} onClose={() => (busy ? undefined : setOpen(false))} title="Report a problem">
        <div className="space-y-4 text-[14px]">
          <p className="text-label2">A member of our team reads every report, usually within a day. The other person is told that a report was made, but not what you wrote.</p>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">What happened?</span>
            <select className={field} value={reason} onChange={(e) => setReason(e.target.value)}>
              {DISPUTE_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">Tell us more</span>
            <textarea className={field} rows={5} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="When, where and what you'd like us to do." />
          </label>
          <p className="rounded-tile bg-danger-t p-3 text-[13px] text-danger">In an emergency, call 119 (police) or 1990 (ambulance) first.</p>
          {error && (
            <p role="alert" className="rounded-tile bg-danger-t p-3 text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={send} disabled={busy || details.trim().length < 10}>
              {busy ? "Sending…" : "Send Report"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
