import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { AdminConsole } from "./admin-console";
import { NoAccess } from "./no-access";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/admin");
  if (user.role !== "ADMIN") return <NoAccess email={user.email} />;
  const [providers, locations] = await Promise.all([serverApi<never[]>("/admin/providers"), serverApi<never[]>("/admin/locations")]);
  return <AdminConsole providers={providers} locations={locations} />;
}
