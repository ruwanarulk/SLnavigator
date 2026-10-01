"use client";

import clsx from "clsx";
import { Bell, FileText, Inbox, Send, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/provider/requests", label: "Trip requests", icon: Inbox, needsApproval: true },
  { href: "/provider/bids", label: "My bids", icon: Send, needsApproval: true },
  { href: "/inbox", label: "Messages", icon: FileText, needsApproval: true },
  { href: "/notifications", label: "Notifications", icon: Bell, needsApproval: false },
  { href: "/provider/profile", label: "Profile & verification", icon: UserRound, needsApproval: false },
] as const;

/** Sidebar on desktop, a scrolling tab strip on phones. Approval-gated pages stay visible but dimmed until verified. */
export function ProviderNav({ name, approved }: { name: string; approved: boolean }) {
  const path = usePathname();
  return (
    <aside className="md:w-60 md:shrink-0">
      <div className="mb-4 hidden items-center gap-3 rounded-card bg-card p-3 md:flex">
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-accent-t font-semibold text-accent-ink">
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{name}</p>
          <p className={clsx("text-[12px] font-medium", approved ? "text-ok" : "text-signal-ink")}>{approved ? "Verified" : "Not yet verified"}</p>
        </div>
      </div>
      <nav aria-label="Provider" className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0">
        {ITEMS.map(({ href, label, icon: Icon, needsApproval }) => {
          const active = path === href || path.startsWith(`${href}/`);
          const locked = needsApproval && !approved;
          return (
            <Link
              key={href}
              href={locked ? "/provider/profile" : href}
              aria-current={active ? "page" : undefined}
              title={locked ? "Available once you are verified" : undefined}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] font-medium transition md:rounded-tile",
                active ? "bg-accent-t text-accent-ink" : "text-label hover:bg-fill",
                locked && "opacity-50",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
