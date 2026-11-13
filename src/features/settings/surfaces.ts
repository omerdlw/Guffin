import { lazySurface } from "@/design/lazy-surface";

export const accountSettingsSurface = lazySurface(() =>
  import("./settings-surface").then((m) => m.accountSettingsSurface),
);
