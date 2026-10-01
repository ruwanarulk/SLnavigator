import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";
import { Bookings, type BookingRow } from "./bookings";

export const metadata: Metadata = { title: "Bookings" };

export default async function ProviderBookingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/provider/bookings");
  if (!isProviderRole(user.role)) redirect("/provider/register");
  if (user.provider?.verificationStatus !== "APPROVED") redirect("/provider/profile");
  const rows = await serverApi<BookingRow[]>("/bookings");
  return <Bookings rows={rows} />;
}
