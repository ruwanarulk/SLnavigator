"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { clearDraft, draftToCreateBody, loadDraft, loadInterests } from "@/lib/draft";
import type { Trip, User } from "@/lib/types";
import { useSession } from "./layout/session";
import { Button, Card, DisplayHeading } from "./ui/primitives";

/** Only same-site relative paths, so `?next=` can't bounce users off-site. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const user = await api<User>(mode === "signup" ? "/auth/register" : "/auth/login", {
        method: "POST",
        json: Object.fromEntries(form),
      });
      setUser(user);

      // Carry over anything planned before signing in.
      let next = safeNext(params.get("next"));
      const draft = loadDraft();
      const importDraft = !!draft?.stops.length;
      track(mode === "signup" ? "signed_up" : "signed_in", { imported_draft: importDraft });
      if (draft && importDraft) {
        const trip = await api<Trip>("/trips", { method: "POST", json: draftToCreateBody(draft) });
        clearDraft();
        track("trip_created", { source: "draft_import", stops: trip.stops.length });
        next = `/plan/${trip.id}`;
      }
      const interests = loadInterests();
      if (mode === "signup" && interests.length) await api("/me", { method: "PATCH", json: { interests } }).catch(() => {});

      router.push(next ?? "/trips");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const other = mode === "signin" ? ["New here?", "Create an account", "/signup"] : ["Already have an account?", "Sign in", "/signin"];
  const qs = params.toString() ? `?${params}` : "";

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-12">
      <DisplayHeading as="h1" className="text-[44px]">
        {mode === "signin" ? "Welcome back" : "Save your trips"}
      </DisplayHeading>
      <p className="mt-2 text-label2">
        {mode === "signin" ? "Sign in to pick up where you left off." : "Free for travellers. Your plans sync across devices and work offline."}
      </p>
      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && <Field name="name" label="Your name" autoComplete="name" />}
          <Field name="email" label="Email" type="email" autoComplete="email" />
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={mode === "signup" ? 8 : undefined}
            hint={mode === "signup" ? "At least 8 characters" : undefined}
          />
          {error && (
            <p role="alert" className="rounded-tile bg-danger-t p-3 text-[14px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "One moment…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-center text-[14px] text-label2">
        {other[0]}{" "}
        <Link href={`${other[2]}${qs}`} className="font-semibold text-accent-ink underline underline-offset-4">
          {other[1]}
        </Link>
      </p>
    </div>
  );
}

function Field({
  name,
  label,
  hint,
  ...props
}: { name: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium">{label}</span>
      <input
        name={name}
        required
        {...props}
        className="h-12 w-full rounded-tile border border-sep bg-bg px-4 text-[16px] outline-none focus:border-accent"
      />
      {hint && <span className="mt-1 block text-[12px] text-label2">{hint}</span>}
    </label>
  );
}
