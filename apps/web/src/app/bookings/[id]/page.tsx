import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { BookingView, type BookingData } from "./booking-view";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage(props: PageProps<"/bookings/[id]">) {
  const { id } = await props.params;
  let booking: BookingData;
  try {
    booking = await serverApi<BookingData>(`/bookings/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/signin?next=/bookings/${id}`);
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return <BookingView key={booking.id} initial={booking} />;
}
