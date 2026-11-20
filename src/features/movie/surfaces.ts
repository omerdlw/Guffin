import { lazySurface } from "@/design/lazy-surface";

export const watchProvidersSurface = lazySurface(() =>
  import("./watch-providers-surface").then((m) => m.watchProvidersSurface),
);
