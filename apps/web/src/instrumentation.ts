import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/sentry-options";

/** Server and edge error tracking (Server Components, route handlers, proxy). */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(sentryOptions);
  }
}

export const onRequestError = Sentry.captureRequestError;
