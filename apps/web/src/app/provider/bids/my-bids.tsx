"use client";

import Link from "next/link";
import { fmtRange, useNow } from "@/components/marketplace/shared";
import { Card, DisplayHeading, Pill } from "@/components/ui/primitives";

export interface MyBid {
  id: string;
  postId: string;
  tripId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  priceUsd: number;
  youReceiveUsd: number;
  tripTitle: string;
  startDate: string;
  endDate: string;
  deadline: string;
  postStatus: "OPEN" | "CLOSED" | "WITHDRAWN";
}

function status(b: MyBid, now: number) {
  if (b.status === "ACCEPTED") return { label: "Accepted", tone: "ok" as const };
  if (b.status === "REJECTED") return { label: "Not selected", tone: "neutral" as const };
  if (b.status === "WITHDRAWN") return { label: b.postStatus === "WITHDRAWN" ? "Request withdrawn" : "You withdrew", tone: "neutral" as const };
  return new Date(b.deadline).getTime() > now ? { label: "Open · waiting", tone: "signal" as const } : { label: "With the traveller", tone: "accent" as const };
}

export function MyBids({ bids }: { bids: MyBid[] }) {
  const now = useNow(60_000);
  return (
    <div>
      <DisplayHeading as="h1" className="text-[40px]">
        My bids
      </DisplayHeading>
      {bids.length === 0 ? (
        <Card className="mt-5 p-10 text-center">
          <p className="font-medium">You haven&apos;t bid on anything yet</p>
          <Link href="/provider/requests" className="mt-2 inline-block text-[14px] font-semibold text-accent-ink underline underline-offset-4">
            See trip requests
          </Link>
        </Card>
      ) : (
        <ul className="mt-5 space-y-3">
          {bids.map((b) => {
            const s = status(b, now);
            const open = b.status === "PENDING" && b.postStatus === "OPEN" && new Date(b.deadline).getTime() > now;
            const body = (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{b.tripTitle}</p>
                    <p className="text-[12px] text-label2">{fmtRange(b.startDate, b.endDate)}</p>
                  </div>
                  <Pill tone={s.tone}>{s.label}</Pill>
                </div>
                <p className="mt-3 text-[14px]">
                  Your bid <span className="font-semibold tabular-nums">${b.priceUsd.toLocaleString("en-US")}</span> · you receive <span className="tabular-nums">${b.youReceiveUsd.toLocaleString("en-US")}</span>
                </p>
              </>
            );
            return (
              <li key={b.id}>
                {open ? (
                  <Link href={`/provider/requests/${b.postId}`} className="block rounded-card bg-card p-4 transition hover:shadow-float">
                    {body}
                  </Link>
                ) : (
                  <div className="rounded-card bg-card p-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
