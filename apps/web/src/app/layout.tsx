import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { BottomNav, Footer, Header } from "@/components/layout/header";
import { SessionProvider } from "@/components/layout/session";
import { ServiceWorker } from "@/components/layout/service-worker";
import { getSessionUser } from "@/lib/server-api";
import "./globals.css";

const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"] });
const sinhala = Noto_Sans_Sinhala({ variable: "--font-sinhala", subsets: ["sinhala"], weight: ["400", "500"] });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Sri Lanka Navigator: plan your trip, compare local guides", template: "%s · Sri Lanka Navigator" },
  description:
    "Build your Sri Lanka route, budget and transport in one place, then travel it with a verified local guide or book it yourself.",
  applicationName: "Sri Lanka Navigator",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${barlow.variable} ${sinhala.variable} ${tamil.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
          Skip to content
        </a>
        <SessionProvider initialUser={user}>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </SessionProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
