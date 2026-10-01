"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 60 * 24) return `${Math.round(min / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function Notifications({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const unread = items.filter((i) => !i.readAt).length;

  // Opening the page counts as seeing the notifications; the dots stay until you leave.
  useEffect(() => {
    if (!initial.some((i) => !i.readAt)) return;
    const t = setTimeout(() => api("/notifications/read", { method: "POST", json: {} }).then(() => window.dispatchEvent(new Event("sln:notifications-read"))).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [initial]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-8">
      <div className="flex items-end justify-between gap-4">
        <DisplayHeading as="h1" className="text-[44px]">
          Notifications
        </DisplayHeading>
        {unread > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await api("/notifications/read", { method: "POST", json: {} });
              setItems((l) => l.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
              window.dispatchEvent(new Event("sln:notifications-read"));
              router.refresh();
            }}
          >
            Mark All Read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-label2">Nothing yet. We&apos;ll tell you here when something needs your attention.</Card>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((n) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">
                    {!n.readAt && <span aria-label="Unread" className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />}
                    {n.title}
                  </p>
                  <span className="shrink-0 text-[12px] text-label2">{ago(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-[14px] text-label2">{n.body}</p>
              </>
            );
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className={clsx("block rounded-card p-4 transition hover:shadow-float", n.readAt ? "bg-card" : "bg-accent-t/40 bg-card")}>
                    {body}
                  </Link>
                ) : (
                  <div className="rounded-card bg-card p-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
