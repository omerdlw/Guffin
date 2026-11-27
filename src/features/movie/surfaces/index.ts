import { lazySurface } from "@/design/surface/lazy";

export const watchProvidersSurface = lazySurface(() =>
  import("./watch-providers").then((m) => m.watchProvidersSurface),
);
