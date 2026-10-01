"use client";

import clsx from "clsx";
import { Briefcase, Car, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/layout/session";
import { Button, Card, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { ProviderType, User } from "@/lib/types";

const TYPES: { id: ProviderType; label: string; blurb: string; icon: typeof UserRound; nameLabel: string }[] = [
  { id: "GUIDE", label: "Independent guide", blurb: "You guide travellers yourself and hold an SLTDA licence.", icon: UserRound, nameLabel: "Name travellers will see" },
  { id: "COMPANY", label: "Tour company", blurb: "A registered business with guides, drivers and vehicles.", icon: Briefcase, nameLabel: "Company name" },
  { id: "TRANSPORT", label: "Driver or vehicle operator", blurb: "Chauffeured cars, vans and tuk-tuks. No guiding.", icon: Car, nameLabel: "Business or driver name" },
];

export function RegisterProvider() {
  const router = useRouter();
  const { setUser } = useSession();
  const [type, setType] = useState<ProviderType>("GUIDE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = TYPES.find((t) => t.id === type)!;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      const user = await api<User>("/auth/register-provider", { method: "POST", json: { ...f, type } });
      setUser(user);
      router.push("/provider/profile");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-10">
      <DisplayHeading as="h1" className="text-[44px]">
        Join as a provider
      </DisplayHeading>
      <p className="mt-2 text-label2">Create your account first. Next you&apos;ll add your profile and documents, and our team reviews them before you appear to travellers.</p>

      <fieldset className="mt-6">
        <legend className="sr-only">Account type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={clsx("flex flex-col items-start gap-2 rounded-tile border p-4 text-left transition", type === id ? "border-accent bg-accent-t" : "border-sep bg-card hover:bg-fill")}
            >
              <Icon aria-hidden className="size-5 text-accent-ink" />
              <span className="text-[14px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-label2">{current.blurb}</p>
      </fieldset>

      <Card className="mt-6 p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={current.nameLabel} name="displayName" autoComplete="organization" />
          <Field label="Your name" name="name" autoComplete="name" hint="The person we should speak to." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base town or city" name="city" />
            <Field label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" hint="Private. Only our team sees it." />
          </div>
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} hint="At least 8 characters" />
          {error && (
            <p role="alert" className="rounded-tile bg-danger-t p-3 text-[14px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Creating your account…" : "Create Provider Account"}
          </Button>
          <p className="text-center text-[13px] text-label2">
            Free to join. Commission applies only to completed trips.
          </p>
        </form>
      </Card>
      <p className="mt-5 text-center text-[14px] text-label2">
        Already registered?{" "}
        <Link href="/signin?next=/provider" className="font-semibold text-accent-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );

}

function Field({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium">{label}</span>
      <input name={name} required className="h-12 w-full rounded-tile border border-sep bg-bg px-4 text-[16px] outline-none focus:border-accent" {...props} />
      {hint && <span className="mt-1 block text-[12px] text-label2">{hint}</span>}
    </label>
  );
}
