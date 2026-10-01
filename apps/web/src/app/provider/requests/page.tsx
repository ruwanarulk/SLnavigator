import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";
import { RequestsBoard, type RequestsData } from "./requests-board";

export const metadata: Metadata = { title: "Trip requests" };

export default async function RequestsPage(props: PageProps<"/provider/requests">) {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/provider/requests");
  if (!isProviderRole(user.role)) redirect("/provider/register");
  if (user.provider?.verificationStatus !== "APPROVED") redirect("/provider/profile");
  const { open } = await props.searchParams;
  const data = await serverApi<RequestsData>("/provider/requests?scope=all");
  return <RequestsBoard initial={data} openId={typeof open === "string" ? open : null} />;
}
