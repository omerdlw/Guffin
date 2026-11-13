import { lazySurface } from "@/design/lazy-surface";

export const reviewEditorSurface = lazySurface(() =>
  import("./editor-surface").then((m) => m.reviewEditorSurface),
);
