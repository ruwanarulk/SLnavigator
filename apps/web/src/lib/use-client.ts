"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True after hydration; false during SSR and the first client render. */
export function useIsClient() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Reads a localStorage value without a hydration mismatch. */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}
