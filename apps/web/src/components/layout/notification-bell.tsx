"use client";

import { Bell, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Unread count, refreshed every 30s and whenever the tab regains focus. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ unread: number; messages: number }>("/notifications/summary")
        .then((r) => {
          if (!alive) return;
          setUnread(r.unread);
          setMessages(r.messages);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 20_000);
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
    <>
      <Badge href="/inbox" label={messages ? `${messages} unread messages` : "Messages"} count={messages} icon={<MessageCircle aria-hidden className="size-5" />} />
      <Badge href="/notifications" label={unread ? `${unread} unread notifications` : "Notifications"} count={unread} icon={<Bell aria-hidden className="size-5" />} />
    </>
  );
}

function Badge({ href, label, count, icon }: { href: string; label: string; count: number; icon: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="relative grid size-10 place-items-center rounded-full hover:bg-fill">
      {icon}
      {count > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
