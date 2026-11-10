import type { Variants } from "@/motion/lib";
import { POINTS } from "@/motion/constants";
import { step } from "@/motion/utils";
import { type MediaCardAspect } from "@/design/components/media-card";
import { TONE } from "@/design/foundations/tones";
import type { AwardsGrouping, AwardsLook } from "./types";

export const WALL_REACH_STEP = 30;

export const MEDIA_GRID_CLASS: Record<MediaCardAspect, string> = {
  free: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  poster: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8",
  square: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6",
  video: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
};

export const WALL_SIZES: Record<"poster" | "video", string> = {
  poster:
    "(min-width: 1536px) 12vw, (min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw",
  video:
    "(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
};

export const GROUPING_LABELS: Record<AwardsGrouping, string> = {
  organizations: "By organization",
  projects: "By project",
  timeline: "Timeline",
};

export const MAX_RECIPIENTS = 4;

export const STAGE_LOOK: AwardsLook = {
  button: "rounded-full",
  logo: "rounded-thumb",
  poster: "rounded-thumb",
  shape: "pill",
};

export const STILL_VARIANTS: Variants = { exit: {}, hidden: {}, visible: {} };

export const AWARD_LIST_VARIANTS: Variants = {
  exit: {
    opacity: 0,
    transition: { duration: step(-2), ease: POINTS.expo },
    y: -8,
  },
  hidden: {},
  visible: { transition: { staggerChildren: step(-4) } },
};

export const AWARD_GROUP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    transition: { duration: step(0), ease: POINTS.expo },
    y: 0,
  },
};

export const INTERMISSION_TIMING = {
  after: step(11),
  drift: step(9),
  enter: step(4),
  leave: step(2),
};

export const ALL_ORGANIZATIONS = "all";

export const LABEL_CLASS = TONE.label;

export const SIDEBAR_FACTS_CLASS =
  "flex flex-col gap-6 sm:col-start-2 sm:max-lg:self-stretch lg:contents";

export const SCROLL_TOP_MARGIN = 24;

export const DETAIL_ACTION_SIZE = "h-12 px-4 py-0 disabled:cursor-wait";

export const DETAIL_ACTION_SECONDARY_SIZE = "h-11 gap-2 px-3";

export const BACKDROP_DEFOCUS_FROM = 24;

export const BACKDROP_DEFOCUS_TO = 560;

export const BACKDROP_CUT_RUNG = 2;

export const BACKDROP_HALATION = 0.55;

export const BACKDROP_POSITION = "center 20%";

export const BACKDROP_FOCUS = [0.5, 0.2] as const;

export const CARD_IMAGE_PATH = "/t/p/w1280/";
