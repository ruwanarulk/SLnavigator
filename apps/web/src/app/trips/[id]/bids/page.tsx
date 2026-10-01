import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Trip } from "@/lib/types";
import { BidsView, type OwnerPost } from "./bids-view";

export const metadata: Metadata = { title: "Bids on your trip" };

export default async function BidsPage(props: PageProps<"/trips/[id]/bids">) {
  const { id } = await props.params;
  let trip: Trip;
  let post: OwnerPost;
  try {
    trip = await serverApi<Trip>(`/trips/${encodeURIComponent(id)}`);
    if (trip.status === "DRAFT" || trip.status === "ARCHIVED") redirect(`/plan/${id}`);
    post = await serverApi<OwnerPost>(`/trips/${encodeURIComponent(id)}/post`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/signin?next=/trips/${id}/bids`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return <BidsView key={trip.id} trip={trip} initial={post} />;
}
