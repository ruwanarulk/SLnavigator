import { BadgeCheck, FileCheck2, Handshake, LineChart, MessagesSquare, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink, Card, DisplayHeading, Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "For guides & tour companies",
  description: "Get ready-to-quote trip requests from international travellers. Free to join; you only pay commission on completed trips.",
};

const STEPS = [
  { icon: FileCheck2, title: "Register and verify", body: "Send your ID, SLTDA guide licence (or business registration and insurance for companies), languages and areas. We review every document and book a short video call." },
  { icon: BadgeCheck, title: "Go live with a badge", body: "Approved profiles appear in the directory with a verified badge. Pending profiles are never shown to travellers." },
  { icon: MessagesSquare, title: "Bid on real trip plans", body: "Travellers post complete plans with dates, stops, group size and budget. You send a price, what's included and a short pitch." },
  { icon: Wallet, title: "Get paid after the trip", body: "Travellers pay into escrow when they accept. Funds are released to you after the trip ends, minus commission." },
];

export default function ForProvidersPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-10 md:px-8">
      <Eyebrow>For guides, tour companies &amp; drivers</Eyebrow>
      <DisplayHeading as="h1" className="mt-2 max-w-3xl text-[48px] md:text-[64px]">
        Trip requests that are ready to quote.
      </DisplayHeading>
      <p className="mt-4 max-w-2xl text-[17px] text-label2">
        No more waiting for walk-ins or paying for ads. Travellers plan their whole route here first, then invite verified local experts to bid.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          [Handshake, "Free to join", "No listing or subscription fees at launch."],
          [Wallet, "Commission only on completed trips", "Typically 10–15%, shown before you bid."],
          [LineChart, "Built-in insights", "Win rate, average bid and reply time."],
        ].map(([Icon, t, b]) => {
          const I = Icon as typeof Wallet;
          return (
            <Card key={t as string} className="p-5">
              <I aria-hidden className="size-5 text-accent-ink" />
              <p className="mt-3 font-semibold">{t as string}</p>
              <p className="text-[14px] text-label2">{b as string}</p>
            </Card>
          );
        })}
      </div>

      <section id="verification" className="mt-16">
        <DisplayHeading className="text-[36px]">How it works</DisplayHeading>
        <ol className="mt-6 grid gap-5 md:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Card className="flex h-full gap-4 p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-t font-display text-[18px] font-bold text-accent-ink">{i + 1}</span>
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <Icon aria-hidden className="size-4" /> {title}
                  </p>
                  <p className="mt-1 text-[14px] text-label2">{body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <Card className="mt-12 flex flex-col items-start justify-between gap-4 bg-accent p-8 text-on-accent md:flex-row md:items-center">
        <div>
          <p className="font-display text-[28px] font-semibold">Register now. We verify every provider.</p>
          <p className="opacity-90">We&apos;re onboarding the first 20–50 guides and companies region by region, starting in the hill country.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/provider/register" variant="inverse">
            Register as a Provider
          </ButtonLink>
          <ButtonLink href="/signin?next=/provider" variant="ghost" className="text-on-accent hover:bg-white/15">
            Sign In
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
