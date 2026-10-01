import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, serverApi } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";
import { ProfileEditor, type ProviderMe } from "./profile-editor";

export const metadata: Metadata = { title: "Profile & verification" };

export default async function ProviderProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/provider/profile");
  if (!isProviderRole(user.role)) redirect("/provider/register");
  const me = await serverApi<ProviderMe>("/provider/me");
  return <ProfileEditor initial={me} />;
}
