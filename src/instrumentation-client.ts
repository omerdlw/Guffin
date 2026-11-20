import {
  browserTracingIntegration,
  captureException,
  captureMessage,
  captureRouterTransitionStart,
  init,
  withScope,
} from "@sentry/nextjs";
import { setReportSink } from "@omerdlw/base-framework/utils";
import { sentryOptions, withSentry } from "@/lib/sentry";

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
