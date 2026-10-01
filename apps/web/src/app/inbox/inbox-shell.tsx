"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { InboxList } from "@/components/messaging/inbox-list";

/** Two panes on desktop. On phones, the list and the open thread take turns. */
export function InboxShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const inThread = path !== "/inbox";
  return (
    <div className="mx-auto grid h-[calc(100dvh-64px-56px)] max-w-[1200px] md:h-[calc(100dvh-64px)] md:grid-cols-[340px_1fr] md:px-8 md:py-6">
      <aside aria-label="Conversations" className={clsx("overflow-y-auto border-sep bg-card md:rounded-l-card md:border-r", inThread && "hidden md:block")}>
        <h1 className="sticky top-0 z-10 border-b border-sep bg-card px-4 py-3 font-display text-[26px] font-semibold">Messages</h1>
        <InboxList />
      </aside>
      <section className={clsx("min-h-0 bg-bg md:rounded-r-card md:bg-card", !inThread && "hidden md:block")}>{children}</section>
    </div>
  );
}
