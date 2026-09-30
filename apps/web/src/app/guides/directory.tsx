"use client";

import { REGIONS } from "@sln/core";
import { useMemo, useState } from "react";
import { ProviderCard } from "@/components/provider-card";
import { Chip } from "@/components/ui/primitives";
import type { Provider } from "@/lib/types";

const TYPES = [
  ["GUIDE", "Guides"],
  ["COMPANY", "Tour companies"],
  ["TRANSPORT", "Transport"],
] as const;

export function Directory({ providers }: { providers: Provider[] }) {
  const [type, setType] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("");

  const languages = useMemo(() => [...new Set(providers.flatMap((p) => p.languages))].sort(), [providers]);
  const shown = providers.filter(
    (p) => (!type || p.type === type) && (!area || p.areas.includes(area)) && (!language || p.languages.includes(language)),
  );

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TYPES.map(([id, l]) => (
          <Chip key={id} active={type === id} onClick={() => setType(type === id ? null : id)}>
            {l}
          </Chip>
        ))}
        <span className="mx-1 h-6 w-px bg-sep" aria-hidden />
        <label>
          <span className="sr-only">Region</span>
          <select value={area ?? ""} onChange={(e) => setArea(e.target.value || null)} className="h-9 rounded-full bg-fill px-3.5 text-[13px] font-medium">
            <option value="">Any region</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-9 rounded-full bg-fill px-3.5 text-[13px] font-medium">
            <option value="">Any language</option>
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mb-3 mt-5 text-[13px] text-label2" aria-live="polite">
        {shown.length} verified {shown.length === 1 ? "provider" : "providers"}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => (
          <ProviderCard key={p.id} p={p} />
        ))}
      </div>
    </>
  );
}
