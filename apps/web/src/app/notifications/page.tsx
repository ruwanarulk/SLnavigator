import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { Notifications, type NotificationItem } from "./notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  if (!(await getSessionUser())) redirect("/signin?next=/notifications");
  const data = await serverApi<{ unread: number; items: NotificationItem[] }>("/notifications");
  return <Notifications initial={data.items} />;
}
