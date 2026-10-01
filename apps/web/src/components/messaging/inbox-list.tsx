"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { initials } from "../marketplace/shared";
import { Pill } from "../ui/primitives";
import type { ConversationSummary } from "./types";

export function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** All conversations, newest first. Refreshes every 15 seconds while the tab is visible. */
export function InboxList() {
  const path = usePathname();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      api<ConversationSummary[]>("/conversations")
        .then((r) => alive && setItems(r))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 15_000);
    document.addEventListener("visibilitychange", load);
    // The open thread announces sends and arrivals so this list never lags behind it.
    window.addEventListener("sln:inbox-changed", load);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener("sln:inbox-changed", load);
    };
  }, [path]);

  if (items === null) {
    return (
      <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading conversations">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-16 rounded-tile" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="p-6 text-center text-[14px] text-label2">No conversations yet. When you message a guide or traveller, it shows up here.</p>;
  }
  return (
    <ul>
      {items.map((c) => {
        const active = path === `/inbox/${c.id}`;
        return (
          <li key={c.id}>
            <Link
              href={`/inbox/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={clsx("flex items-start gap-3 border-b border-sep px-4 py-3.5 transition hover:bg-fill", active && "bg-accent-t")}
            >
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-t text-[13px] font-semibold text-accent-ink">
                {initials(c.counterparty.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={clsx("truncate text-[14px]", c.unread ? "font-bold" : "font-semibold")}>{c.counterparty.name}</span>
                  <span className="shrink-0 text-[11px] text-label2">{c.lastMessage ? ago(c.lastMessage.at) : ""}</span>
                </span>
                <span className="block truncate text-[12px] text-label2">{c.tripTitle}</span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={clsx("block min-w-0 flex-1 truncate text-[13px]", c.unread ? "font-medium text-label" : "text-label2")}>
                    {c.lastMessage ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.body}` : "No messages yet"}
                  </span>
                  {c.bookingId && <Pill tone="ok">Booked</Pill>}
                  {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-on-accent">{c.unread}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
