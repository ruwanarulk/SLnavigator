"use client";

import { useSyncExternalStore } from "react";

// Once Google fails (key rejected, billing off, API disabled, script blocked),
// every map on the page uses the built-in island map for the rest of the visit.
let failed = false;
const listeners = new Set<() => void>();

export function markGoogleFailed() {
  if (failed) return;
  failed = true;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  // Google's documented hook for authentication failures.
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = markGoogleFailed;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useGoogleFailed() {
  return useSyncExternalStore(
    subscribe,
    () => failed,
    () => false,
  );
}
