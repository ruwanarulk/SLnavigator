"use client";

import { convert, formatMoney } from "@sln/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { FxRates, User } from "@/lib/types";
import { useStoredString } from "@/lib/use-client";

interface SessionValue {
  user: User | null;
  setUser: (u: User | null) => void;
  currency: string;
  setCurrency: (c: string) => void;
  rates: Record<string, number>;
  /** Formats a whole-USD amount in the traveller's currency. */
  money: (usd: number) => string;
}

const SessionContext = createContext<SessionValue | null>(null);
const CURRENCY_KEY = "sln_currency";

export function SessionProvider({ initialUser, children }: { initialUser: User | null; children: ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const stored = useStoredString(CURRENCY_KEY);
  const [chosen, setChosen] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  // Explicit choice this session, then the account setting, then this device's last choice.
  const currency = chosen ?? user?.currency ?? stored ?? "USD";

  useEffect(() => {
    api<FxRates>("/fx")
      .then((r) => setRates(r.rates))
      .catch(() => {});
  }, []);

  const setCurrency = useCallback(
    (c: string) => {
      setChosen(c);
      try {
        localStorage.setItem(CURRENCY_KEY, c);
      } catch {
        /* storage unavailable */
      }
      if (user) api("/me", { method: "PATCH", json: { currency: c } }).catch(() => {});
    },
    [user],
  );

  const value = useMemo<SessionValue>(() => {
    const perUsd = rates[currency];
    const shown = perUsd ? currency : "USD";
    return {
      user,
      setUser,
      currency: shown,
      setCurrency,
      rates,
      money: (usd) => formatMoney(convert(usd, perUsd ?? 1), shown),
    };
  }, [user, currency, rates, setCurrency]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
