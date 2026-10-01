"use client";

import { useState } from "react";
import { BidPanel, type RequestItem } from "@/components/provider/bid-panel";

export function RequestDetail({ initial }: { initial: RequestItem }) {
  const [request, setRequest] = useState(initial);
  return <BidPanel request={request} onChanged={setRequest} />;
}
