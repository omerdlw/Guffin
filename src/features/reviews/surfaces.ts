import { lazySurface } from "@/design/lazy-surface";
import type { ReviewTarget } from "./review-surface";

export const reviewEditorSurface = lazySurface(() =>
  import("./editor-surface").then((m) => m.reviewEditorSurface),
);

export const reviewSurface = lazySurface<{ target: ReviewTarget }>(() =>
  import("./review-surface").then((m) => m.reviewSurface),
);
