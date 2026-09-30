import { seasonHeadline } from "@sln/core";
import { ArrowRight, BadgeCheck, Bus, CalendarRange, CarFront, Check, Map, ShieldCheck, Sun, TrainFront, WalletCards, Zap } from "lucide-react";
import Link from "next/link";
import { ItineraryCard, MiniLine } from "@/components/itinerary-card";
import { ButtonLink, Card, DisplayHeading, Eyebrow, Pill } from "@/components/ui/primitives";
import { SceneArt } from "@/components/ui/scene-art";
import { serverApi } from "@/lib/server-api";
import type { Itinerary } from "@/lib/types";

const TRUST = [
  { icon: ShieldCheck, title: "Every provider is checked", body: "ID and licences reviewed by our team before a profile goes live." },
  { icon: WalletCards, title: "Budget in your currency", body: "Stays, transport, food and fees, updated as you plan." },
  { icon: Map, title: "Real routes, real drive times", body: "See how long each leg takes by car, train or bus." },
  { icon: CalendarRange, title: "Plan around the monsoons", body: "Two coasts, two rainy seasons. We flag which side is dry." },
];

export default async function Home() {
  const itineraries = await serverApi<Itinerary[]>("/itineraries").catch(() => [] as Itinerary[]);
  const loop = itineraries.find((i) => i.slug === "island-loop");

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.1fr_1fr] md:px-8 md:pb-20 md:pt-16">
        <div className="space-y-6">
          <Eyebrow>Sri Lanka · trip planner &amp; local guide marketplace</Eyebrow>
          <DisplayHeading as="h1" className="text-[52px] md:text-[76px]">
            Plan the whole island. Let local guides compete for it.
          </DisplayHeading>
          <p className="max-w-xl text-[17px] leading-relaxed text-label2">
            Build your route, budget and transport in one place. Then get offers from verified Sri Lankan guides and tour companies, or book the trains,
            buses and cars yourself.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/start" size="lg">
              Start Planning. It&apos;s Free <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/itineraries" size="lg" variant="secondary">
              Browse Itineraries
            </ButtonLink>
          </div>
          <p className="flex items-center gap-2 text-[13px] text-label2">
            <BadgeCheck aria-hidden className="size-4" /> No booking fees for travellers · No account needed to start
          </p>
        </div>
        <div className="relative">
          <SceneArt hue="sand" label="Sigiriya at sunrise" className="aspect-[4/3.4] rounded-[28px]" />
          {loop && (
            <Card className="absolute -bottom-6 left-4 w-[290px] p-4 shadow-float md:-left-10">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[14px] font-semibold">
                  {loop.title} · {loop.days} days
                </p>
                <Pill tone="accent">{loop.stops.length} stops</Pill>
              </div>
              <MiniLine from={loop.stops[0].location.name} to={loop.stops[loop.stops.length - 1].location.name} count={loop.stops.length} />
            </Card>
          )}
          <div className="glass absolute right-4 top-4 flex items-center gap-2 rounded-tile px-3 py-2 text-[13px] shadow-float">
            <Sun aria-hidden className="size-4 text-signal" />
            <span className="max-w-[220px] leading-snug">{seasonHeadline(new Date().getMonth()).split(".")[0]}.</span>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-[1320px] px-4 md:px-8">
        <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <div>
                <p className="text-[14px] font-semibold">{title}</p>
                <p className="text-[13px] text-label2">{body}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1320px] px-4 py-16 md:px-8 md:py-24">
        <Eyebrow className="text-label2">How it works</Eyebrow>
        <DisplayHeading className="mb-10 mt-1 text-[40px] md:text-[52px]">One plan. Two ways to travel it.</DisplayHeading>
        <ol className="grid gap-8 md:grid-cols-3">
          {[
            ["Plan it on one map", "Pick stops, see drive times between them, and watch a live budget in your own currency."],
            ["Get offers, or book it yourself", "Post the plan and verified local guides send bids. Or compare car, train and bus for every leg."],
            ["Travel, then rate each other", "Payment is held until your trip ends. Reviews only come from completed bookings, and both sides rate blind."],
          ].map(([t, b], i) => (
            <li key={t} className="relative">
              <div className="mb-4 flex items-center gap-2" aria-hidden>
                <span className={`size-4 border-[3px] border-accent bg-card ${i === 0 ? "rounded-[3px]" : "rounded-full"}`} />
                <span className="h-[3px] flex-1 bg-accent" />
              </div>
              <h3 className="text-[18px] font-semibold">{t}</h3>
              <p className="mt-1 text-[14px] text-label2">{b}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <div className="rounded-card bg-accent p-7 text-on-accent md:p-9">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.15em] opacity-80">With a local guide</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Opening soon</span>
            </div>
            <DisplayHeading as="h3" className="mt-4 text-[34px]">
              Post your plan. Compare real offers.
            </DisplayHeading>
            <p className="mt-3 text-[15px] opacity-90">
              Guides and companies who cover your route bid with a price, what&apos;s included and a short pitch. You chat, compare side by side, and only pay when
              you accept.
            </p>
            <ul className="mt-5 space-y-2 text-[14px]">
              {["Bids close in 48–72 hours, no endless back-and-forth", "See verification, response time and completed trips", "Payment held in escrow until your trip ends"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/guides" variant="inverse" className="mt-7">
              Meet the Guides
            </ButtonLink>
          </div>
          <Card className="p-7 md:p-9">
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-label2">On your own</p>
            <DisplayHeading as="h3" className="mt-4 text-[34px]">
              Every leg, compared.
            </DisplayHeading>
            <p className="mt-3 text-[15px] text-label2">
              Mix a train from Kandy to Ella with a chauffeured car to the coast and a bus to Galle. See rough cost and time for each option before you go.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [TrainFront, "Trains", "Scenic routes"],
                [CarFront, "Cars & drivers", "Self-drive or chauffeured"],
                [Bus, "Buses", "Timetables & fares"],
                [Zap, "Tuk-tuks", "Short hops in town"],
              ].map(([Icon, t, s]) => {
                const I = Icon as typeof Bus;
                return (
                  <div key={t as string} className="rounded-tile bg-fill p-3">
                    <I aria-hidden className="size-5" />
                    <p className="mt-2 text-[13px] font-semibold">{t as string}</p>
                    <p className="text-[12px] text-label2">{s as string}</p>
                  </div>
                );
              })}
            </div>
            <ButtonLink href="/start" variant="secondary" className="mt-7">
              Plan It Myself
            </ButtonLink>
          </Card>
        </div>
      </section>

      {/* Itineraries */}
      {itineraries.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pb-20 md:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <Eyebrow className="text-label2">Start from a route</Eyebrow>
              <DisplayHeading className="mt-1 text-[40px]">Themed itineraries</DisplayHeading>
            </div>
            <Link href="/itineraries" className="text-[14px] font-semibold text-accent-ink underline underline-offset-4">
              All Itineraries →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {itineraries
              .filter((i) => i.slug !== "island-loop")
              .slice(0, 3)
              .map((it) => (
                <ItineraryCard key={it.id} it={it} />
              ))}
          </div>
        </section>
      )}
    </>
  );
}
