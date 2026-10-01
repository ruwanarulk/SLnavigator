"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { BidPanel, RequestCard, type RequestItem } from "@/components/provider/bid-panel";
import { Card, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export interface RequestsData {
  matching: number;
  all: number;
  items: RequestItem[];
}

export function RequestsBoard({ initial, openId }: { initial: RequestsData; openId: string | null }) {
  const [items, setItems] = useState(initial.items);
  const [scope, setScope] = useState<"matching" | "all">(initial.items.some((i) => i.matches) ? "matching" : "all");
  const [selectedId, setSelectedId] = useState<string | null>(openId && initial.items.some((i) => i.id === openId) ? openId : null);

  // New requests land all day; refresh every minute while the tab is visible.
  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== "visible") return;
      api<RequestsData>("/provider/requests?scope=all")
        .then((d) => setItems(d.items))
        .catch(() => {});
    };
    const t = setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  const matching = useMemo(() => items.filter((i) => i.matches), [items]);
  const shown = scope === "matching" ? matching : items;
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const replace = (r: RequestItem) => setItems((l) => l.map((x) => (x.id === r.id ? r : x)));

  return (
    <div>
      <DisplayHeading as="h1" className="text-[40px]">
        Trip requests
      </DisplayHeading>
      <div role="tablist" aria-label="Which requests" className="mt-4 flex flex-wrap gap-2">
        {([
          ["matching", `Matching me · ${matching.length}`],
          ["all", `All open · ${items.length}`],
        ] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={scope === id} onClick={() => setScope(id)} className={clsx("h-9 rounded-full px-4 text-[13px] font-medium", scope === id ? "bg-accent text-on-accent" : "bg-fill text-label hover:bg-sep")}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          {shown.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-medium">{scope === "matching" ? "No matching requests right now" : "No open requests right now"}</p>
              <p className="mt-1 text-[14px] text-label2">
                {scope === "matching" ? "We'll notify you when a traveller posts a trip in your regions. You can also look at all open requests." : "New requests appear here as soon as travellers post them."}
              </p>
            </Card>
          ) : (
            shown.map((r) => <RequestCard key={r.id} r={r} href={`/provider/requests/${r.id}`} selected={r.id === selectedId} onClick={() => setSelectedId(r.id)} />)
          )}
        </div>
        <div className="hidden lg:block">
          {selected ? (
            <div className="sticky top-24">
              <BidPanel key={selected.id} request={selected} onChanged={replace} />
            </div>
          ) : (
            <Card className="p-8 text-center text-label2">Select a request to read the details and place a bid.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
