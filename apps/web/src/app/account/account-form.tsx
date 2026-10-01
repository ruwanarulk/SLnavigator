"use client";

import { CURRENCIES, INTERESTS } from "@sln/core";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/layout/session";
import { Button, ButtonLink, Card, Chip, DisplayHeading } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function AccountForm({ user }: { user: User }) {
  const router = useRouter();
  const { setUser, setCurrency } = useSession();
  const [name, setName] = useState(user.name);
  const [currency, setCur] = useState(user.currency);
  const [interests, setInterests] = useState(user.interests);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setStatus("saving");
    try {
      const updated = await api<User>("/me", { method: "PATCH", json: { name, currency, interests } });
      setUser(updated);
      setCurrency(updated.currency);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-8">
      <DisplayHeading as="h1" className="text-[44px]">
        Profile
      </DisplayHeading>
      <p className="text-label2">{user.email}</p>
      <Card className="mt-6 space-y-6 p-6">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-12 w-full rounded-tile border border-sep bg-bg px-4 outline-none focus:border-accent" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Show prices in</span>
          <select value={currency} onChange={(e) => setCur(e.target.value)} className="h-12 w-full rounded-tile border border-sep bg-bg px-4">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 text-[14px] font-medium">Interests (used for suggestions)</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = interests.includes(i.id);
              return (
                <Chip key={i.id} active={on} onClick={() => setInterests(on ? interests.filter((x) => x !== i.id) : [...interests, i.id])}>
                  {on && <Check aria-hidden className="size-3.5" />}
                  {i.label}
                </Chip>
              );
            })}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={status === "saving"}>
            Save Changes
          </Button>
          <span role="status" className="text-[13px] text-label2">
            {status === "saved" ? "Saved" : status === "error" ? "Couldn't save. Try again." : ""}
          </span>
        </div>
      </Card>
      <div className="mt-6 flex flex-wrap gap-3">
        {user.role === "ADMIN" && (
          <ButtonLink href="/admin" variant="secondary">
            Admin Console
          </ButtonLink>
        )}
        <Button variant="secondary" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
