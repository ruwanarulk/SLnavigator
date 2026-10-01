import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";
import type { RequestItem } from "@/components/provider/bid-panel";
import { RequestDetail } from "./request-detail";

export const metadata: Metadata = { title: "Trip request" };

export default async function RequestPage(props: PageProps<"/provider/requests/[id]">) {
  const { id } = await props.params;
  const user = await getSessionUser();
  if (!user) redirect(`/signin?next=/provider/requests/${id}`);
  if (!isProviderRole(user.role)) redirect("/provider/register");
  if (user.provider?.verificationStatus !== "APPROVED") redirect("/provider/profile");
  let request: RequestItem;
  try {
    request = await serverApi<RequestItem>(`/provider/requests/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <div className="space-y-4">
      <Link href="/provider/requests" className="text-[13px] font-medium text-label2 hover:text-label">
        ← All requests
      </Link>
      <RequestDetail initial={request} />
    </div>
  );
}
