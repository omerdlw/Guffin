import { lazySurface } from "@/design/lazy-surface";

export const showStatusSurface = lazySurface(() =>
  import("./status-surface").then((m) => m.showStatusSurface),
);
