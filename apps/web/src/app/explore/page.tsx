import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import type { LocationCard } from "@/lib/types";
import { Explore } from "./explore";

export const metadata: Metadata = {
  title: "Explore places",
  description: "Temples, beaches, national parks, waterfalls and hill-country towns across Sri Lanka, with seasons, fees and time needed.",
};

export default async function ExplorePage() {
  const places = await serverApi<LocationCard[]>("/locations");
  return <Explore places={places} />;
}
