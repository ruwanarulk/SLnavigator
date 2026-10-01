"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Unread count, refreshed every 30s and whenever the tab regains focus. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ unread: number }>("/notifications/summary")
        .then((r) => alive && setUnread(r.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("sln:notifications-read", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("sln:notifications-read", load);
    };
  }, []);

  return (
    <Link href="/notifications" aria-label={unread ? `${unread} unread notifications` : "Notifications"} className="relative grid size-10 place-items-center rounded-full hover:bg-fill">
      <Bell aria-hidden className="size-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span>
      )}
    </Link>
  );
}
