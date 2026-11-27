import { lazySurface } from "@/design/surface/lazy";

export const accountBioSurface = lazySurface(() =>
  import("./bio").then((m) => m.accountBioSurface),
);

export const accountNotificationsSurface = lazySurface(() =>
  import("./notifications").then((m) => m.accountNotificationsSurface),
);

export const accountSetupSurface = lazySurface(() =>
  import("./setup").then((m) => m.accountSetupSurface),
);

export const accountSettingsSurface = lazySurface(() =>
  import("./settings/settings").then((m) => m.accountSettingsSurface),
);
