"use client";

import { DEFAULT_BUDGET, type BudgetSettings } from "@sln/core";
import type { TripStop } from "./types";

/**
 * A trip planned before signing up lives in localStorage and is imported into
 * the account on sign-in. Storage can be unavailable (private mode), so every
 * access is guarded.
 */
export interface LocalDraft {
  title: string;
  startDate: string | null;
  travelers: number;
  budgetSettings: BudgetSettings;
  stops: TripStop[];
  itinerarySlug?: string;
}

const KEY = "sln_draft_v1";
const INTERESTS_KEY = "sln_interests";

export function emptyDraft(): LocalDraft {
  return { title: "My Sri Lanka trip", startDate: null, travelers: 2, budgetSettings: DEFAULT_BUDGET, stops: [] };
}

export function loadDraft(): LocalDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: LocalDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

export function loadInterests(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INTERESTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveInterests(ids: string[]) {
  try {
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable */
  }
}

/** Body for POST /trips when importing a local draft. */
export function draftToCreateBody(d: LocalDraft) {
  return {
    title: d.title,
    startDate: d.startDate ?? undefined,
    travelers: d.travelers,
    budget: d.budgetSettings,
    itinerarySlug: d.itinerarySlug,
    stops: d.stops.map((s) => ({ locationId: s.location.id, nights: s.nights, modeToNext: s.modeToNext })),
  };
}
