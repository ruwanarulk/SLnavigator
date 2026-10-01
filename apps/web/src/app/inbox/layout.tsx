import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server-api";
import { InboxShell } from "./inbox-shell";

export default async function InboxLayout({ children }: LayoutProps<"/inbox">) {
  if (!(await getSessionUser())) redirect("/signin?next=/inbox");
  return <InboxShell>{children}</InboxShell>;
}
