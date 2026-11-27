import { lazySurface } from "@/design/surface/lazy";

export const followsSurface = lazySurface(() =>
  import("./follows").then((m) => m.followsSurface),
);
