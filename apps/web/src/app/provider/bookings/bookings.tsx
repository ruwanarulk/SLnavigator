"use client";

import Link from "next/link";
import { fmtRange } from "@/components/marketplace/shared";
import { Card, DisplayHeading, Pill } from "@/components/ui/primitives";
import { useSession } from "@/components/layout/session";

export interface BookingRow {
  id: string;
  phase: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priceUsd: number;
  youReceiveUsd?: number;
  tripTitle: string;
  startDate: string | null;
  endDate: string | null;
  counterparty: string;
}

const TONE = { UPCOMING: "accent", IN_PROGRESS: "ok", COMPLETED: "neutral", CANCELLED: "danger" } as const;
const LABEL = { UPCOMING: "Upcoming", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;

export function Bookings({ rows }: { rows: BookingRow[] }) {
  const { money } = useSession();
  return (
    <div>
      <DisplayHeading as="h1" className="text-[40px]">
        Bookings
      </DisplayHeading>
      {rows.length === 0 ? (
        <Card className="mt-5 p-10 text-center">
          <p className="font-medium">No bookings yet</p>
          <p className="mt-1 text-[14px] text-label2">When a traveller accepts your bid it appears here.</p>
        </Card>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/bookings/${r.id}`} className="block rounded-card bg-card p-4 transition hover:shadow-float">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.tripTitle}</p>
                    <p className="text-[12px] text-label2">
                      {r.counterparty}
                      {r.startDate && r.endDate ? ` · ${fmtRange(r.startDate, r.endDate)}` : ""}
                    </p>
                  </div>
                  <Pill tone={TONE[r.phase]}>{LABEL[r.phase]}</Pill>
                </div>
                <p className="mt-3 text-[14px]">
                  {money(r.priceUsd)}
                  {r.youReceiveUsd !== undefined && <span className="text-label2"> · you receive {money(r.youReceiveUsd)}</span>}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
