import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";

/** A trip's booking lives at /bookings/:id; this finds it from the trip. */
export default async function TripBookingRedirect(props: PageProps<"/trips/[id]/booking">) {
  const { id } = await props.params;
  try {
    const { id: bookingId } = await serverApi<{ id: string }>(`/trips/${encodeURIComponent(id)}/booking`);
    redirect(`/bookings/${bookingId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/signin?next=/trips/${id}/booking`);
    if (e instanceof ApiError) redirect(`/plan/${id}`);
    throw e;
  }
}
