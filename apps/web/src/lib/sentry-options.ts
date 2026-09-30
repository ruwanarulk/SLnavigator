import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_HEADERS = ["cookie", "authorization", "set-cookie"];

/** Shared by browser, server and edge Sentry so every runtime scrubs the same data. */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { deny: SENSITIVE_HEADERS },
    httpBodies: [],
  },
  beforeSend(event: ErrorEvent) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      for (const h of SENSITIVE_HEADERS) delete event.request.headers?.[h];
    }
    if (event.user) event.user = { id: event.user.id };
    return event;
  },
};
