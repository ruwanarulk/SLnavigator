import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";
import { MyBids, type MyBid } from "./my-bids";

export const metadata: Metadata = { title: "My bids" };

export default async function BidsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/provider/bids");
  if (!isProviderRole(user.role)) redirect("/provider/register");
  if (user.provider?.verificationStatus !== "APPROVED") redirect("/provider/profile");
  const bids = await serverApi<MyBid[]>("/provider/bids");
  return <MyBids bids={bids} />;
}
