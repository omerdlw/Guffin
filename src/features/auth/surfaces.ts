import { lazySurface } from "@/design/lazy-surface";

export const signInSurface = lazySurface(() =>
  import("./sign-in-surface").then((m) => m.signInSurface),
);

export const verificationSurface = lazySurface(() =>
  import("./verification-surface").then((m) => m.verificationSurface),
);
