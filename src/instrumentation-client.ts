// Browser error reporting and performance: Sentry starts before the app does,
// so it catches errors during hydration and records Web Vitals (LCP, INP, CLS)
// through browser tracing. Off until NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";
import { setReportSink } from "@omerdlw/base-framework/utils";
import { sentryOptions, withSentry } from "@/lib/sentry";

Sentry.init({
  ...sentryOptions(),
  integrations: [Sentry.browserTracingIntegration()],
});

setReportSink(
  withSentry(Sentry, (scope, error, level) =>
    (level === "warn" ? console.warn : console.error)(scope, error),
  ),
);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
