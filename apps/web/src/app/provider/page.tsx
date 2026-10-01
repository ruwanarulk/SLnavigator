import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";

/** Approved providers land on their requests; everyone else finishes verification first. */
export default async function ProviderHome() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/provider");
  if (!isProviderRole(user.role)) redirect("/provider/register");
  redirect(user.provider?.verificationStatus === "APPROVED" ? "/provider/requests" : "/provider/profile");
}
