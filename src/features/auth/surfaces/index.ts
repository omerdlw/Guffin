import { lazySurface } from "@/design/surface/lazy";

export const signInSurface = lazySurface(() =>
  import("./sign-in").then((m) => m.signInSurface),
);

export const verificationSurface = lazySurface(() =>
  import("./verification").then((m) => m.verificationSurface),
);
