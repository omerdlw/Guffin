import { setReportSink } from "@omerdlw/base-framework/utils";
import {
  browserTracingIntegration,
  captureException,
  captureMessage,
  captureRouterTransitionStart,
  init,
  withScope,
} from "@sentry/nextjs";
import { sentryOptions, withSentry } from "@/infrastructure/sentry";
import { watchStuckRoutes } from "@/infrastructure/stuck-watchdog";

if (process.env.NODE_ENV === "development") watchStuckRoutes();

init({
  ...sentryOptions(),
  integrations: [browserTracingIntegration()],
});

setReportSink(
  withSentry(
    { captureException, captureMessage, withScope },
    (scope, error, level) =>
      (level === "warn" ? console.warn : console.error)(scope, error),
  ),
);

export const onRouterTransitionStart = captureRouterTransitionStart;
