import { lazySurface } from "@/design/surface/lazy";

export const listFormSurface = lazySurface(() =>
  import("./form").then((m) => m.listFormSurface),
);

export const listOrderSurface = lazySurface(() =>
  import("./order").then((m) => m.listOrderSurface),
);

export const listPickerSurface = lazySurface(() =>
  import("./picker").then((m) => m.listPickerSurface),
);
