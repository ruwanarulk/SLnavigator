import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-api";
import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Profile" };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin?next=/account");
  return <AccountForm user={user} />;
}
