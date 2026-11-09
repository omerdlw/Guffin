import styles from "./tooltip.module.css";

/**
 * The tooltip's parts, for a surface drawn without the `Tooltip` component
 * (a chart's hover label, the dock's command tips).
 */
export const TOOLTIP = {
  content: styles.content,
  dock: styles.dock,
  ink: styles.ink,
  meta: styles.meta,
} as const;
