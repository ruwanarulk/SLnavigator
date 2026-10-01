import { formatMoney, REGIONS } from "@sln/core";
import { Clock, Languages, MapPin, MessageCircle, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { initials, replyTime, TYPE_LABEL } from "@/components/provider-card";
import { Button, ButtonLink, Card, DisplayHeading, Pill, Rating, SampleBadge, VerifiedBadge } from "@/components/ui/primitives";
import { ProviderReviews, type PublicReviews } from "@/components/reviews/provider-reviews";
import { SceneArt } from "@/components/ui/scene-art";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { Provider } from "@/lib/types";

async function load(slug: string) {
  try {
    return await serverApi<Provider>(`/providers/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata(props: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const p = await load((await props.params).slug);
  return { title: `${p.displayName}, ${TYPE_LABEL[p.type].toLowerCase()} in ${p.city}`, description: p.bio.slice(0, 160) };
}

export default async function ProviderPage(props: PageProps<"/guides/[slug]">) {
  const slug = (await props.params).slug;
  const p = await load(slug);
  // Sample profiles have no real bookings behind them, so there is nothing to fetch.
  const reviews = p.isSample ? null : await serverApi<PublicReviews>(`/providers/${encodeURIComponent(slug)}/reviews`).catch(() => null);
  const areas = p.areas.map((a) => REGIONS.find((r) => r.id === a)?.label ?? a);

  return (
    <article className="mx-auto max-w-[1000px] px-4 pb-24 pt-6 md:px-8">
      <SceneArt hue="leaf" className="h-48 rounded-[28px] md:h-64" />
      <div className="relative -mt-12 flex flex-col gap-4 px-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-end gap-4">
          <span aria-hidden className="grid size-24 place-items-center rounded-full border-4 border-bg bg-accent-t text-[28px] font-semibold text-accent-ink">
            {initials(p.displayName)}
          </span>
          <div className="pb-1 pt-12">
            <DisplayHeading as="h1" className="text-[40px]">
              {p.displayName}
            </DisplayHeading>
            <p className="text-[14px] text-label2">
              {TYPE_LABEL[p.type]} · {p.city}
              {p.yearsActive ? ` · ${p.yearsActive} years guiding` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled title="Messaging opens with the marketplace">
            <MessageCircle className="size-4" /> Message
          </Button>
          <ButtonLink href="/plan">Plan a Trip</ButtonLink>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 px-2">
        {p.verificationStatus === "APPROVED" && <VerifiedBadge />}
        {p.isSample && <SampleBadge />}
        {p.reviewCount > 0 && <Rating value={p.rating} count={p.reviewCount} />}
      </div>
      {p.isSample && (
        <p className="mx-2 mt-3 rounded-tile bg-signal-t p-3 text-[13px] text-signal-ink">
          This is a sample profile used to demonstrate the directory. It is not a real business.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <p className="text-[17px] leading-relaxed">{p.bio}</p>
          <div>
            <h2 className="mb-2 text-[15px] font-semibold">Specialties</h2>
            <div className="flex flex-wrap gap-1.5">
              {p.specialties.map((s) => (
                <Pill key={s} tone="accent">
                  {s}
                </Pill>
              ))}
            </div>
          </div>
          {reviews ? (
            <ProviderReviews data={reviews} />
          ) : (
            <Card className="p-5 text-[14px] text-label2">Reviews appear here once travellers complete trips booked through Navigator. Only completed bookings can leave a review.</Card>
          )}
        </div>
        <Card className="divide-y divide-sep p-5 text-[14px]">
          <Row icon={Languages} label="Languages" value={p.languages.join(", ")} />
          <Row icon={MapPin} label="Covers" value={areas.join(", ")} />
          {replyTime(p.responseTimeMin) && <Row icon={Clock} label="Response time" value={replyTime(p.responseTimeMin)!} />}
          {p.priceFromUsd && (
            <Row
              icon={Wallet}
              label="Typical day rate"
              value={`${formatMoney(p.priceFromUsd, "USD")}–${formatMoney(p.priceToUsd ?? p.priceFromUsd, "USD")}`}
            />
          )}
        </Card>
      </div>
    </article>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-label2" />
      <div>
        <p className="text-[12px] text-label2">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
