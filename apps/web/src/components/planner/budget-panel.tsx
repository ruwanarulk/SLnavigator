"use client";

import { convert, CURRENCIES, formatMoney, type BudgetBreakdown, type BudgetSettings } from "@sln/core";
import clsx from "clsx";
import { Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useSession } from "../layout/session";

const LINES: { key: keyof Omit<BudgetBreakdown, "total" | "perPerson">; label: string; color: string }[] = [
  { key: "stays", label: "Stays", color: "var(--accent)" },
  { key: "transport", label: "Transport", color: "#5E9E98" },
  { key: "guide", label: "Guide", color: "var(--signal)" },
  { key: "food", label: "Food", color: "#8C7B5A" },
  { key: "entryFees", label: "Entry fees", color: "var(--label)" },
  { key: "buffer", label: "Buffer", color: "var(--sep)" },
];

export function BudgetPanel({
  budget,
  settings,
  travelers,
  days,
  onSettings,
  onTravelers,
}: {
  budget: BudgetBreakdown;
  settings: BudgetSettings;
  travelers: number;
  days: number;
  onSettings: (s: Partial<BudgetSettings>) => void;
  onTravelers: (n: number) => void;
}) {
  const { money, currency, setCurrency, rates } = useSession();
  const [open, setOpen] = useState(false);
  const total = Math.max(1, budget.total);

  return (
    <section aria-labelledby="budget-h" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="budget-h" className="text-[15px] font-semibold">
          Budget
        </h2>
        <label>
          <span className="sr-only">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-full bg-fill px-3 py-1.5 text-[13px] font-medium">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div aria-live="polite">
        <p className="font-display text-[44px] font-semibold leading-none tabular-nums">{money(budget.total)}</p>
        <p className="mt-1 text-[13px] text-label2">
          {money(budget.perPerson)} per person
          {currency !== "LKR" && rates.LKR && <> · ≈ {formatMoney(convert(budget.total, rates.LKR), "LKR")}</>}
        </p>
      </div>

      <div className="flex h-2.5 overflow-hidden rounded-full bg-fill" aria-hidden>
        {LINES.map((l) => (
          <span key={l.key} style={{ width: `${(budget[l.key] / total) * 100}%`, background: l.color }} className="transition-[width] duration-300" />
        ))}
      </div>

      <dl className="divide-y divide-sep text-[14px]">
        {LINES.map((l) => (
          <div key={l.key} className="flex items-center justify-between py-2">
            <dt className="flex items-center gap-2 text-label2">
              <span aria-hidden className="size-2 rounded-full" style={{ background: l.color }} />
              {l.key === "buffer" ? `Buffer ${settings.bufferPct}%` : l.label}
            </dt>
            <dd className="font-semibold tabular-nums">{money(budget[l.key])}</dd>
          </div>
        ))}
      </dl>

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-2 text-[14px] font-semibold text-accent-ink underline underline-offset-4">
        <SlidersHorizontal className="size-4" /> Adjust Budget
      </button>

      {open && (
        <div className="space-y-4 rounded-tile bg-fill/60 p-4">
          <Stepper label="Travellers" value={travelers} min={1} max={20} onChange={onTravelers} />
          <Segmented
            label="Stays"
            value={settings.stayTier}
            options={[
              ["guesthouse", "Guesthouse"],
              ["boutique", "Boutique"],
              ["luxury", "Luxury"],
            ]}
            onChange={(v) => onSettings({ stayTier: v as BudgetSettings["stayTier"] })}
          />
          <Segmented
            label="Food"
            value={settings.foodLevel}
            options={[
              ["shoestring", "Street food"],
              ["comfortable", "Comfortable"],
              ["splurge", "Splurge"],
            ]}
            onChange={(v) => onSettings({ foodLevel: v as BudgetSettings["foodLevel"] })}
          />
          <Slider
            label="Guide days"
            hint="Estimate until you compare real guide offers"
            value={Math.min(settings.guideDays, days)}
            max={Math.max(days, 1)}
            format={(v) => `${v} of ${days} days`}
            onChange={(v) => onSettings({ guideDays: v })}
          />
          <Slider label="Contingency buffer" value={settings.bufferPct} max={30} step={5} format={(v) => `${v}%`} onChange={(v) => onSettings({ bufferPct: v })} />
          <p className="text-[12px] text-label2">
            Planning estimates, not quotes. Stays assume two travellers per room; cars and tuk-tuks are shared by the group.
          </p>
        </div>
      )}
    </section>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-fill p-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={clsx("h-8 rounded-full text-[12px] font-medium transition", value === v ? "bg-card shadow-sm" : "text-label2 hover:text-label")}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Slider({
  label,
  hint,
  value,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-label2">{format(value)}</span>
      </span>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
      {hint && <span className="text-[12px] text-label2">{hint}</span>}
    </label>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-fill">
        <button aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-8 place-items-center rounded-full hover:bg-sep disabled:opacity-40">
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-[14px] font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-8 place-items-center rounded-full hover:bg-sep disabled:opacity-40">
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
