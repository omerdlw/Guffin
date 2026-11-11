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
