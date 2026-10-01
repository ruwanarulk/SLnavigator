"use client";

import { BID_WINDOWS, INTERESTS, SERVICE_NEEDS, type ServiceNeedId } from "@sln/core";
import clsx from "clsx";
import { Check, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { loadInterests } from "@/lib/draft";
import { isProviderRole, type Trip } from "@/lib/types";
import { useSession } from "../layout/session";
import { Button, Chip } from "../ui/primitives";

const LANGUAGES = ["German", "French", "Chinese", "Russian", "Japanese", "Hindi", "Dutch", "Italian", "Spanish", "Sinhala", "Tamil"];
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const round50 = (n: number) => Math.max(50, Math.round(n / 50) * 50);

/** "Get Guide Bids": turns the plan into a request that verified guides can bid on. */
export function PostTripForm({
  trip,
  startDate,
  travelers,
  stops,
  days,
  onNeedAccount,
}: {
  trip: Trip | null;
  startDate: string | null;
  travelers: number;
  stops: number;
  days: number;
  onNeedAccount: () => void;
}) {
  const router = useRouter();
  const { user } = useSession();
  const total = trip?.budget.total ?? 0;
  const [form, setForm] = useState({
    startDate: startDate && startDate >= tomorrow() ? startDate : "",
    adults: Math.max(1, travelers),
    children: 0,
    need: "GUIDE_AND_TRANSPORT" as ServiceNeedId,
    budgetMin: total ? String(round50(total * 0.9)) : "",
    budgetMax: total ? String(round50(total * 1.3)) : "",
    interests: user?.interests.length ? user.interests : loadInterests(),
    languages: [] as string[],
    notes: "",
    window: 48,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  // Toggles read the latest list, so quick successive clicks never overwrite each other.
  const toggleIn = (k: "interests" | "languages", v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  if (!trip || !user) {
    return (
      <div className="space-y-4 text-[14px]">
        <p>
          Verified guides and companies who cover your route will bid on this plan. To post it, we need an account so they can reply to you and you can compare offers.
        </p>
        <p className="rounded-tile bg-fill p-3 text-label2">Your plan is kept. Creating an account is free, and you pay nothing to receive bids.</p>
        <Button className="w-full" onClick={onNeedAccount}>
          {user ? "Save Trip & Continue" : "Create Free Account to Continue"}
        </Button>
      </div>
    );
  }
  if (isProviderRole(user.role)) {
    return <p className="rounded-tile bg-fill p-4 text-[14px] text-label2">Guide and company accounts can bid on trips but can&apos;t post them. Use a traveller account to post a trip.</p>;
  }

  async function submit() {
    setError(null);
    if (!form.startDate) return setError("Choose your start date.");
    const min = Number(form.budgetMin);
    const max = Number(form.budgetMax);
    if (!(min >= 0) || !(max >= min) || !form.budgetMax) return setError("Enter a budget range, with the maximum at least as high as the minimum.");
    setBusy(true);
    try {
      await api(`/trips/${trip!.id}/post`, {
        method: "POST",
        json: {
          startDate: form.startDate,
          adults: form.adults,
          children: form.children,
          budgetMinUsd: min,
          budgetMaxUsd: max,
          need: form.need,
          interests: form.interests,
          languages: form.languages,
          notes: form.notes,
          deadlineHours: form.window,
        },
      });
      track("trip_posted", { stops, days, window_hours: form.window, need: form.need });
      router.push(`/trips/${trip!.id}/bids`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const input = "h-11 w-full rounded-tile border border-sep bg-bg px-3.5 text-[15px] outline-none focus:border-accent";
  return (
    <div className="space-y-5 text-[14px]">
      <p className="text-label2">
        {stops} {stops === 1 ? "stop" : "stops"} · {days} days. Once posted, your plan is locked so everyone bids on the same trip. You can withdraw it at any time.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">Start date</span>
          <input type="date" min={tomorrow()} className={input} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Adults" value={form.adults} min={1} max={20 - form.children} onChange={(v) => set("adults", v)} />
          <Stepper label="Children" value={form.children} min={0} max={Math.min(10, 20 - form.adults)} onChange={(v) => set("children", v)} />
        </div>
      </div>

      <Segmented label="What do you need?" value={form.need} options={SERVICE_NEEDS.map((n) => [n.id, n.label])} onChange={(v) => set("need", v as ServiceNeedId)} />

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">Budget from (USD, whole group)</span>
          <input type="number" min={0} inputMode="numeric" className={input} value={form.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">to (USD)</span>
          <input type="number" min={0} inputMode="numeric" className={input} value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Interests (helps match you with the right guides)</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <Chip key={i.id} active={form.interests.includes(i.id)} onClick={() => toggleIn("interests", i.id)}>
              {form.interests.includes(i.id) && <Check aria-hidden className="size-3.5" />}
              {i.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Other languages you&apos;d like the guide to speak (English is assumed)</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip key={l} active={form.languages.includes(l)} onClick={() => toggleIn("languages", l)}>
              {form.languages.includes(l) && <Check aria-hidden className="size-3.5" />}
              {l}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium">Anything else guides should know?</span>
        <textarea
          className={clsx(input, "h-auto min-h-24 py-3")}
          maxLength={1000}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Pace, mobility, dietary needs, special occasions, early starts…"
        />
      </label>

      <Segmented label="Take bids for" value={String(form.window)} options={BID_WINDOWS.map((h) => [String(h), `${h} hours`])} onChange={(v) => set("window", Number(v))} />

      {error && (
        <p role="alert" className="rounded-tile bg-danger-t p-3 text-danger">
          {error}
        </p>
      )}
      <Button size="lg" className="w-full" onClick={submit} disabled={busy}>
        {busy ? "Posting…" : "Post My Trip"}
      </Button>
      <p className="text-center text-[12px] text-label2">Free for travellers. Guides see your first name only; your contact details stay private.</p>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      <div className="flex h-11 items-center justify-between rounded-tile border border-sep bg-bg px-1.5">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-8 place-items-center rounded-full hover:bg-fill disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <span className="tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-8 place-items-center rounded-full hover:bg-fill disabled:opacity-40">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="grid gap-1 rounded-full bg-fill p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={clsx("h-9 rounded-full px-2 text-[13px] font-medium transition", value === v ? "bg-card shadow-sm" : "text-label2 hover:text-label")}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
