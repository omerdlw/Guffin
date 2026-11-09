// Server-side error reporting.
//
// `report()` falls back to `console.error(scope, error)`, and Supabase's
// PostgrestError keeps `message`, `code`, `details` and `hint` as
// non-enumerable properties, so the dev overlay rendered it as `{}`. This sink
// flattens any error into a readable object before it reaches the console.

function describe(error: unknown): unknown {
  if (!(error instanceof Error)) {
    if (error && typeof error === "object") {
      const { message, code, details, hint } = error as Record<string, unknown>;
      if (message !== undefined || code !== undefined) {
        return { message, code, details, hint };
      }
    }
    return error;
  }
  const { code, details, hint } = error as Error & Record<string, unknown>;
  const cause = (error as { cause?: unknown }).cause;
  return {
    name: error.name,
    message: error.message,
    ...(code !== undefined && { code }),
    ...(details ? { details } : {}),
    ...(hint ? { hint } : {}),
    ...(cause !== undefined && { cause: describe(cause) }),
    stack: error.stack,
  };
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { setReportSink } = await import("@omerdlw/base-framework/utils");
  setReportSink((scope, error, level) => {
    const log = level === "warn" ? console.warn : console.error;
    const info = describe(error);
    const summary =
      info && typeof info === "object" && "message" in info
        ? ` ${[(info as { code?: unknown }).code, (info as { message?: unknown }).message].filter(Boolean).join(" ")}`
        : "";
    log(`[${scope}]${summary}`, info);
  });
}
