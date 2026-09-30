"use client";

import { useState } from "react";
import { analyticsEnabled, consentStatus, identify, setConsent } from "@/lib/analytics";
import { useIsClient } from "@/lib/use-client";
import { Button } from "../ui/primitives";
import { useSession } from "./session";

/** Asks once before analytics cookies are set. Declining still allows anonymous, cookieless counts. */
export function ConsentBanner() {
  const isClient = useIsClient();
  const { user } = useSession();
  const [answered, setAnswered] = useState(false);

  if (!isClient || !analyticsEnabled || answered || consentStatus() !== "pending") return null;

  function choose(granted: boolean) {
    setConsent(granted);
    if (granted && user) identify({ id: user.id, role: user.role });
    setAnswered(true);
  }

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="glass fixed inset-x-3 bottom-[72px] z-50 mx-auto max-w-xl rounded-card p-4 shadow-float md:bottom-6"
    >
      <p className="text-[14px]">
        We use cookies to understand how travellers use the planner, so we can make it better. No ads, and we never sell your data.
        {user ? "" : " Your trip plans work either way."}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => choose(false)}>
          Decline
        </Button>
        <Button size="sm" onClick={() => choose(true)}>
          Accept
        </Button>
      </div>
    </div>
  );
}
