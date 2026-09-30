import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import type { Trip } from "@/lib/types";
import { MyTrips } from "./my-trips";

export const metadata: Metadata = { title: "My trips" };

export default async function TripsPage() {
  if (!(await getSessionUser())) redirect("/signin?next=/trips");
  const [drafts, archived] = await Promise.all([serverApi<Trip[]>("/trips"), serverApi<Trip[]>("/trips?status=ARCHIVED")]);
  return <MyTrips drafts={drafts} archived={archived} />;
}
