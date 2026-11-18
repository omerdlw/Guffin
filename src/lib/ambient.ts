import type { AmbientAnalysisOptions } from "@omerdlw/base-framework/ambient/server";

/**
 * Guffin is paper: every palette, on the server and in the browser, is made
 * for a light ground. Server and client must agree, or the client drops a
 * served palette made for the other ground. Long-lived server caches key on
 * this and `AMBIENT_ANALYSIS_VERSION`.
 */
export const AMBIENT_ANALYSIS = Object.freeze({
  ground: "light",
} satisfies Partial<AmbientAnalysisOptions>);
