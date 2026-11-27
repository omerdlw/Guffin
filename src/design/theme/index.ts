import { ambientThemeConfig } from "./ambient";
import { contextMenuThemeConfig } from "./context-menu";
import { controlsThemeConfig } from "./controls";
import { dockThemeConfig } from "./dock";
import { errorThemeConfig } from "./error";
import { modalThemeConfig } from "./modal";
import { notificationThemeConfig } from "./notification";

export const themes = Object.freeze([
  errorThemeConfig,
  ambientThemeConfig,
  contextMenuThemeConfig,
  controlsThemeConfig,
  dockThemeConfig,
  modalThemeConfig,
  notificationThemeConfig,
]);
