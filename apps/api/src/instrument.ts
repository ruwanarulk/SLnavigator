// Loaded before anything else in main.ts so Sentry can instrument the app.
import * as Sentry from '@sentry/nestjs';

// ConfigModule reads .env later, so load it here for SENTRY_DSN. Real env vars win.
try {
  process.loadEnvFile();
} catch {
  // No .env file (e.g. in production, where env comes from the host).
}

const SENSITIVE_HEADERS = ['cookie', 'authorization', 'set-cookie'];

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Travellers' identities, session cookies and request bodies (passwords, trip data) stay out of reports.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { deny: SENSITIVE_HEADERS },
      httpBodies: [],
    },
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        for (const h of SENSITIVE_HEADERS) delete event.request.headers?.[h];
      }
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}
