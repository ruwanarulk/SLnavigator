import { ProviderNav } from "@/components/provider/provider-nav";
import { getSessionUser } from "@/lib/server-api";
import { isProviderRole } from "@/lib/types";

export default async function ProviderLayout({ children }: LayoutProps<"/provider">) {
  const user = await getSessionUser();
  // /provider/register is public; the rest needs a provider account. The register page
  // renders its own chrome, so only signed-in providers get the sidebar.
  if (!user || !user.provider || !isProviderRole(user.role)) return <>{children}</>;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-28 pt-6 md:flex-row md:gap-8 md:px-8 md:pt-8">
      <ProviderNav name={user.provider ? user.name : "Provider"} approved={user.provider.verificationStatus === "APPROVED"} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
