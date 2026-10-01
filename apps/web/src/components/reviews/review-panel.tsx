"use client";

import clsx from "clsx";
import { Lock, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "../marketplace/shared";
import { Button, Card, Pill, Rating } from "../ui/primitives";

interface Criterion {
  id: string;
  label: string;
}

interface ReviewView {
  overall: number;
  scores: Record<string, number>;
  recommend: boolean;
  text: string;
}

interface ReviewState {
  direction: "TRAVELLER_TO_PROVIDER" | "PROVIDER_TO_TRAVELLER";
  phase: "UNAVAILABLE" | "NOT_YET" | "OPEN" | "CLOSED" | "DONE";
  opensAt: string | null;
  revealAt: string | null;
  closesAt: string | null;
  criteria: Criterion[];
  counterpart: string;
  mine: ReviewView | null;
  theirs: ReviewView | null;
  revealed: boolean;
  awaitingOther: boolean;
}

const textarea = "w-full rounded-tile border border-sep bg-bg px-3.5 py-3 text-[15px] outline-none focus:border-accent";

/** Tap-to-score row, 1 to 5. */
function Stars({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[14px]">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 5`} onClick={() => onChange(n)} className="grid size-9 place-items-center rounded-full hover:bg-fill">
            <Star aria-hidden className={clsx("size-5", n <= value ? "fill-signal text-signal" : "text-sep")} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ title, r, criteria }: { title: string; r: ReviewView; criteria: Criterion[] }) {
  return (
    <div className="rounded-tile bg-fill p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium">{title}</p>
        <Rating value={r.overall} />
      </div>
      {criteria.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-label2">
          {criteria.map((c) => (
            <li key={c.id}>
              {c.label}: <span className="font-medium text-label">{r.scores[c.id] ?? "–"}</span>
            </li>
          ))}
        </ul>
      )}
      {r.text && <p className="mt-2 text-[14px] leading-relaxed">{r.text}</p>}
    </div>
  );
}

/** Blind mutual review for one booking: write yours after the trip, see theirs once both are in. */
export function ReviewPanel({ bookingId, viewer }: { bookingId: string; viewer: "TRAVELLER" | "PROVIDER" }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommend, setRecommend] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<ReviewState>(`/bookings/${bookingId}/review`).then(setState, () => setState(null)), [bookingId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!state || state.phase === "UNAVAILABLE") return null;
  const isTraveller = viewer === "TRAVELLER";
  const complete = state.criteria.every((c) => scores[c.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      setState(await api<ReviewState>(`/bookings/${bookingId}/review`, { method: "POST", json: { scores, recommend, text } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{isTraveller ? `How was ${state.counterpart}?` : `How was ${state.counterpart} as a guest?`}</h2>
        {state.phase === "DONE" && <Pill tone="ok">Submitted</Pill>}
      </div>

      {state.phase === "NOT_YET" && state.opensAt && (
        <p className="mt-2 text-[14px] text-label2">
          Reviews open on {fmtDate(state.opensAt)}, a few days after the trip, so they reflect the whole experience. We&apos;ll remind you.
        </p>
      )}
      {state.phase === "CLOSED" && <p className="mt-2 text-[14px] text-label2">The review window for this trip has closed.</p>}

      {state.phase === "OPEN" && (
        <div className="mt-3 space-y-3">
          <p className="flex gap-2 text-[12px] text-label2">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {isTraveller
              ? `Reviews are blind: you and ${state.counterpart} write yours first, then both are shown. Yours appears on their public profile.`
              : "Only other providers will see this. It never appears on the traveller's profile, and they can't read it."}
          </p>
          <div className="divide-y divide-sep">
            {state.criteria.map((c) => (
              <Stars key={c.id} label={c.label} value={scores[c.id] ?? 0} onChange={(n) => setScores((s) => ({ ...s, [c.id]: n }))} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={recommend} onChange={(e) => setRecommend(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
            {isTraveller ? "I'd recommend them to other travellers" : "I'd host this traveller again"}
          </label>
          <textarea className={textarea} rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder={isTraveller ? "What stood out? Keep it honest and specific." : "Anything other providers should know?"} aria-label="Written review" />
          {error && (
            <p role="alert" className="rounded-tile bg-danger-t p-3 text-[14px] text-danger">
              {error}
            </p>
          )}
          <Button onClick={submit} disabled={busy || !complete}>
            {busy ? "Sending…" : "Submit Review"}
          </Button>
        </div>
      )}

      {state.phase === "DONE" && state.mine && (
        <div className="mt-3 space-y-3">
          <ReviewCard title="Your review" r={state.mine} criteria={state.criteria} />
          {state.awaitingOther && state.revealAt && (
            <p className="text-[13px] text-label2">
              {state.counterpart} hasn&apos;t written theirs yet. {isTraveller ? "Your review goes public" : "Their review appears here"} when they do, or on {fmtDate(state.revealAt)}.
            </p>
          )}
          {!isTraveller && state.theirs && <ReviewCard title={`${state.counterpart}'s review of you`} r={state.theirs} criteria={[]} />}
        </div>
      )}
    </Card>
  );
}
