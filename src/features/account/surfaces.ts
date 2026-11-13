import { lazySurface } from "@/design/lazy-surface";

export const accountBioSurface = lazySurface(() =>
  import("./bio-surface").then((m) => m.accountBioSurface),
);

export const accountNotificationsSurface = lazySurface(() =>
  import("./notifications-surface").then((m) => m.accountNotificationsSurface),
);

export const accountSetupSurface = lazySurface(() =>
  import("./setup-surface").then((m) => m.accountSetupSurface),
);
