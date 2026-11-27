import { lazySurface } from "@/design/surface/lazy";
import type { ReviewTarget } from "./review";

export const reviewEditorSurface = lazySurface(() =>
  import("./editor").then((m) => m.reviewEditorSurface),
);

export const reviewSurface = lazySurface<{ target: ReviewTarget }>(() =>
  import("./review").then((m) => m.reviewSurface),
);
