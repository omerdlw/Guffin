import { lazySurface } from "@/design/lazy-surface";

export const personBioSurface = lazySurface(() =>
  import("./bio-surface").then((m) => m.personBioSurface),
);
