import { lazySurface } from "@/design/lazy-surface";

export const followsSurface = lazySurface(() =>
  import("./follows-surface").then((m) => m.followsSurface),
);
