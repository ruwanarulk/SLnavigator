"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "../ui/primitives";

/** Opens (or reuses) the thread for a trip and provider, then goes to it. */
export function StartConversation({ tripId, providerId, label = "Message", variant = "secondary", size = "md" }: { tripId: string; providerId?: string; label?: string; variant?: "secondary" | "primary" | "ghost"; size?: "sm" | "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/conversations", { method: "POST", json: { tripId, providerId } });
      router.push(`/inbox/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} size={size} onClick={go} disabled={busy}>
        <MessageCircle aria-hidden className="size-4" /> {busy ? "Opening…" : label}
      </Button>
      {error && (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
