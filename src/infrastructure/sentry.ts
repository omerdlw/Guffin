import type { ReportSink } from "@omerdlw/base-framework/utils";
import { getSentryDsn } from "@/infrastructure/config";

type Sentry = Pick<
  typeof import("@sentry/nextjs"),
  "captureException" | "captureMessage" | "withScope"
>;

const PRODUCTION = process.env.NODE_ENV === "production";

export function sentryOptions() {
  return {
    dsn: getSentryDsn() ?? undefined,
    enabled: Boolean(getSentryDsn()),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: PRODUCTION ? 0.1 : 1,
  };
}

export function withSentry(sentry: Sentry, sink: ReportSink): ReportSink {
  return (scope, error, level) => {
    sink(scope, error, level);
    if (!getSentryDsn()) return;
    sentry.withScope((context) => {
      context.setTag("report.scope", scope);
      if (level === "warn") {
        context.setLevel("warning");
        sentry.captureMessage(
          `[${scope}] ${error instanceof Error ? error.message : String(error)}`,
        );
      } else {
        sentry.captureException(error);
      }
    });
  };
}
