import posthog from "posthog-js";

/**
 * Product analytics. Events map to the Phase 1 question in Website-Plan.md §2:
 * is the planner useful enough that people build, save and come back to trips?
 * All calls are no-ops until PostHog is configured and initialised.
 */
export type AnalyticsEvent =
  | { name: "onboarding_completed"; props: { interests: number; days: number; built_route: boolean } }
  | { name: "trip_created"; props: { source: "onboarding" | "itinerary" | "place_page" | "draft_import"; stops: number } }
  | { name: "stop_added"; props: { source: "search" | "suggestion" | "map_preview" | "place_page" } }
  | { name: "stop_removed"; props: Record<string, never> }
  | { name: "stops_reordered"; props: Record<string, never> }
  | { name: "transport_mode_changed"; props: { mode: string } }
  | { name: "budget_adjusted"; props: { field: string } }
  | { name: "itinerary_customized"; props: { slug: string } }
  | { name: "fork_opened"; props: { path: "book_myself" | "guide_bids" } }
  | { name: "signed_up"; props: { imported_draft: boolean } }
  | { name: "signed_in"; props: { imported_draft: boolean } };

// Only the public project key (phc_) may ship to browsers; secret keys are refused.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const analyticsEnabled = !!KEY && KEY.startsWith("phc_");

export function initAnalytics() {
  if (!analyticsEnabled || typeof window === "undefined") return;
  posthog.init(KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2026-08-30",
    // Nothing is captured until the visitor chooses. Accept: normal cookies.
    // Decline: anonymous cookieless counting (must be enabled in PostHog project settings).
    opt_out_capturing_by_default: true,
    cookieless_mode: "on_reject",
    person_profiles: "identified_only",
    // Never record what people type (names, emails, passwords).
    session_recording: { maskAllInputs: true },
  });
}

export function track<E extends AnalyticsEvent>(name: E["name"], props: E["props"]) {
  if (!analyticsEnabled || !posthog.__loaded) return;
  posthog.capture(name, props);
}

/** Links events to the account by opaque id only; no email or name is sent. */
export function identify(user: { id: string; role: string } | null) {
  if (!analyticsEnabled || !posthog.__loaded) return;
  if (!user) {
    posthog.reset();
    return;
  }
  if (posthog.get_explicit_consent_status() === "granted") posthog.identify(user.id, { role: user.role });
}

export type ConsentStatus = "granted" | "denied" | "pending";

export function consentStatus(): ConsentStatus {
  if (!analyticsEnabled || !posthog.__loaded) return "granted";
  return posthog.get_explicit_consent_status();
}

export function setConsent(granted: boolean) {
  if (!analyticsEnabled || !posthog.__loaded) return;
  if (granted) posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
}
