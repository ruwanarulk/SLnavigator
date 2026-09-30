import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { DisplayHeading } from "@/components/ui/primitives";
import { serverApi } from "@/lib/server-api";
import type { Provider } from "@/lib/types";
import { Directory } from "./directory";

export const metadata: Metadata = {
  title: "Local guides & tour companies",
  description: "Verified Sri Lankan guides, tour companies and drivers, with languages, specialties and response times.",
};

export default async function GuidesPage() {
  const providers = await serverApi<Provider[]>("/providers");
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-24 pt-8 md:px-8">
      <DisplayHeading as="h1" className="text-[44px] md:text-[56px]">
        Local guides &amp; companies
      </DisplayHeading>
      <p className="mt-3 flex max-w-3xl items-start gap-2 text-[15px] text-label2">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
        Every profile here has been checked by our team: identity, licences and, for companies, business registration and insurance. Unverified accounts are never shown.
      </p>
      <Directory providers={providers} />
    </div>
  );
}
