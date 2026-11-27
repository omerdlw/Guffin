import { lazySurface } from "@/design/surface/lazy";

export const personBioSurface = lazySurface(() =>
  import("./bio").then((m) => m.personBioSurface),
);
