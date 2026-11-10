/**
 * The one door to the animation library.
 *
 * Nothing outside `src/motion` imports `motion/react` itself: a feature or a
 * design component takes the library's primitives from here, so every movement
 * in the product is reachable from the engine, and ESLint (`no-restricted-imports`)
 * keeps it that way. Durations, curves and springs still come from the engine
 * (`step`, `POINTS`, `SPRING`), never typed by hand.
 */
export {
  animate,
  AnimatePresence,
  LayoutGroup,
  motion,
  MotionConfig,
  Reorder,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
export type { MotionValue, TargetAndTransition, Variants } from "motion/react";
