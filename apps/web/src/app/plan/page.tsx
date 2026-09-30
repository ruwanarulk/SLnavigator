import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LocalPlanner } from "@/components/planner/local-planner";
import { getSessionUser, serverApi } from "@/lib/server-api";
import type { LocationCard, Trip } from "@/lib/types";

export const metadata: Metadata = { title: "Trip planner" };

/** Signed-in travellers land on their latest draft; everyone else plans locally. */
export default async function PlanPage(props: PageProps<"/plan">) {
  const { fresh } = await props.searchParams;
  const user = await getSessionUser();
  if (user && !fresh) {
    const trips = await serverApi<Trip[]>("/trips");
    if (trips[0]) redirect(`/plan/${trips[0].id}`);
  }
  const places = await serverApi<LocationCard[]>("/locations");
  return <LocalPlanner places={places} />;
}
