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

// Named imports only: handing the whole `@sentry/nextjs` namespace around
// keeps every integration in the client bundle (Replay, Feedback…), used or
// not.
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
