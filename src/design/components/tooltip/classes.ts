import { ui } from "../../ui";
import styles from "./tooltip.module.css";

export const TOOLTIP = {
  content: ui.parts.tooltip.content(),
  dock: styles.dock,
  ink: ui.parts.tooltip.label(),
  meta: styles.meta,
} as const;
