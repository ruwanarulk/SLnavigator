"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/layout/session";
import { Button, ButtonLink, Card, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";

/** Shown to a signed-in traveller who opens /admin, instead of a bare 404. */
export function NoAccess({ email }: { email: string }) {
  const router = useRouter();
  const { setUser } = useSession();

  async function switchAccount() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/signin?next=/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-16">
      <DisplayHeading as="h1" className="text-[40px]">
        Admin access only
      </DisplayHeading>
      <p className="mt-3 text-label2">
        You&apos;re signed in as <span className="font-medium text-label">{email}</span>, which isn&apos;t an admin account.
      </p>
      <Card className="mt-6 flex flex-col gap-3 p-6">
        <Button onClick={switchAccount}>Sign In With an Admin Account</Button>
        <ButtonLink href="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </Card>
    </div>
  );
}
