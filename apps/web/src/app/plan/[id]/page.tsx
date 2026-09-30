import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Planner } from "@/components/planner/planner";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { LocationCard, Trip } from "@/lib/types";

export const metadata: Metadata = { title: "Trip planner" };

export default async function SavedPlanPage(props: PageProps<"/plan/[id]">) {
  const { id } = await props.params;
  let trip: Trip;
  try {
    trip = await serverApi<Trip>(`/trips/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/signin?next=/plan/${id}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const places = await serverApi<LocationCard[]>("/locations");
  // Remount when switching trips so planner state never leaks between them.
  return <Planner key={trip.id} trip={trip} places={places} />;
}
