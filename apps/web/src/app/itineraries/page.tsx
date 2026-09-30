import type { Metadata } from "next";
import { ItineraryCard } from "@/components/itinerary-card";
import { DisplayHeading } from "@/components/ui/primitives";
import { serverApi } from "@/lib/server-api";
import type { Itinerary } from "@/lib/types";

export const metadata: Metadata = {
  title: "Themed itineraries",
  description: "Ready-made Sri Lanka routes you can customise: the Cultural Triangle, tea country by train, the south coast and more.",
};

export default async function ItinerariesPage() {
  const itineraries = await serverApi<Itinerary[]>("/itineraries");
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 md:px-8">
      <DisplayHeading as="h1" className="text-[44px] md:text-[56px]">
        Start from a route
      </DisplayHeading>
      <p className="mt-2 max-w-2xl text-[16px] text-label2">Pick a themed itinerary, then make it yours: add stops, change nights, swap the car for the train.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {itineraries.map((it) => (
          <ItineraryCard key={it.id} it={it} />
        ))}
      </div>
    </div>
  );
}
