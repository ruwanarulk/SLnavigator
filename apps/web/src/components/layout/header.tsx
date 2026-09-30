"use client";

import { CURRENCIES } from "@sln/core";
import clsx from "clsx";
import { Compass, Globe, Map, Route, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ButtonLink, buttonClass } from "../ui/primitives";
import { Logo } from "../ui/logo";
import { useSession } from "./session";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/itineraries", label: "Itineraries" },
  { href: "/guides", label: "Guides" },
  { href: "/for-providers", label: "For providers" },
];

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const { user, setUser, currency, setCurrency } = useSession();

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-sep bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 md:px-8">
        <Logo />
        <nav aria-label="Main" className="mx-auto hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx("text-[14px] font-medium hover:text-accent-ink", path.startsWith(n.href) ? "text-accent-ink" : "text-label")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <label className="relative hidden items-center gap-1.5 text-[13px] font-medium sm:flex">
            <Globe aria-hidden className="size-4" />
            <span className="sr-only">Display currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent pr-1 font-medium outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} · EN
                </option>
              ))}
            </select>
          </label>
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className={clsx(buttonClass("ghost", "sm"), "hidden md:inline-flex")}>
                  Admin
                </Link>
              )}
              <Link href="/trips" className={clsx(buttonClass("secondary", "sm"), "hidden md:inline-flex")}>
                My Trips
              </Link>
              <button onClick={signOut} className={clsx(buttonClass("ghost", "sm"), "hidden md:inline-flex")}>
                Sign out
              </button>
            </>
          ) : (
            <ButtonLink href="/signin" variant="secondary" size="sm">
              Sign In
            </ButtonLink>
          )}
          <ButtonLink href="/start" size="sm" className="hidden sm:inline-flex">
            Plan a Trip
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

const TABS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/trips", label: "Trips", icon: Route },
  { href: "/account", label: "Profile", icon: UserRound },
];

/** Mobile bottom navigation, per the Product Plan §13. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="App"
      className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx("flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-accent-ink" : "text-label2")}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Footer() {
  const path = usePathname();
  // The planner is a full-height app screen.
  if (path.startsWith("/plan")) return null;
  return (
    <footer className="border-t border-sep bg-card pb-20 md:pb-0">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 text-[13px] text-label2 md:grid-cols-4 md:px-8">
        <div className="space-y-3">
          <Logo />
          <p>Plan the whole island, then travel it with a verified local guide or on your own.</p>
        </div>
        <FooterCol title="Travel" links={[["Explore places", "/explore"], ["Themed itineraries", "/itineraries"], ["Plan a trip", "/start"]]} />
        <FooterCol title="Providers" links={[["Guide directory", "/guides"], ["Become a guide", "/for-providers"]]} />
        <FooterCol title="Trust" links={[["How verification works", "/for-providers#verification"], ["About estimates", "/explore#estimates"]]} />
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 font-semibold text-label">{title}</p>
      <ul className="space-y-1.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-accent-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
