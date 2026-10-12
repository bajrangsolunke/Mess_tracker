/** Error alerts via Sentry, only when VITE_SENTRY_DSN is set (the SDK is then loaded on
 *  demand, so it costs nothing otherwise). No personal data: member link secrets are masked
 *  and user details are not sent. */

type SentryModule = typeof import("@sentry/react");

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const LINK = /\/m\/[A-Za-z0-9_-]{16,32}/g;
let sentry: SentryModule | null = null;

const mask = (url?: string) => url?.replace(LINK, "/m/[link]");

export async function initMonitoring(): Promise<void> {
  if (!DSN) return;
  sentry = await import("@sentry/react");
  sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request?.url) event.request.url = mask(event.request.url);
      delete event.user;
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (crumb.data?.url) crumb.data.url = mask(String(crumb.data.url));
      if (crumb.data?.to) crumb.data.to = mask(String(crumb.data.to));
      if (crumb.data?.from) crumb.data.from = mask(String(crumb.data.from));
      return crumb;
    },
  });
}

export function reportError(error: unknown): void {
  sentry?.captureException(error);
}
