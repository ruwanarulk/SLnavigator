// Runs in the browser before the app hydrates.
import * as Sentry from "@sentry/nextjs";
import { initAnalytics } from "./lib/analytics";
import { sentryOptions } from "./lib/sentry-options";

Sentry.init(sentryOptions);
initAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
