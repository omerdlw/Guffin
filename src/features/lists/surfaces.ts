import { lazySurface } from "@/design/lazy-surface";

export const listFormSurface = lazySurface(() =>
  import("./form-surface").then((m) => m.listFormSurface),
);

export const listOrderSurface = lazySurface(() =>
  import("./order-surface").then((m) => m.listOrderSurface),
);

export const listPickerSurface = lazySurface(() =>
  import("./picker-surface").then((m) => m.listPickerSurface),
);
