"use client";

import { useSession } from "@/components/layout/session";

export function PriceFrom({ usd }: { usd: number }) {
  const { money } = useSession();
  return (
    <p className="text-[15px]">
      from <span className="font-display text-[28px] font-semibold">{money(usd)}</span> per person
    </p>
  );
}
