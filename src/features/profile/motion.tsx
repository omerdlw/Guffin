"use client";

import type { Curve, Enter, Look } from "@/motion/choreography/choreo";
import { defineStage } from "@/motion/choreography/stage";
import { TEMPO } from "@/motion/choreography/pace";

const PHI = 1.618034;
const beat = (n: number) => Math.round(PHI ** n * 1000) / 1000;
const STAGGER = { bar: 0.034 };
const SETTLE: Curve = [0.236, 0.382, 0.146, 1];
const TOUCH: Curve = [0.382, 0.236, 0.146, 1];
// Backdrop opening: the camera pulls back from a dark close-up (dolly, most
// travel early, long settle) while the lens racks into focus and the frame
// develops from grey to full colour.
const DOLLY: Curve = [0.146, 0.618, 0.146, 1];
const FOCUS: Curve = [0.236, 0, 0.146, 1];
const reveal = (from: Look, more: Partial<Enter> = {}): Enter => ({
  on: "view",
  from,
  duration: beat(-1),
  ease: SETTLE,
  ...more,
});

const PROFILE = defineStage({
  parts: [
    "avatar",
    "name",
    "bio",
    "section",
    "review",
    "list",
    "tile",
    "header",
    "filters",
    "favorite",
    "stat",
    "week",
    "row",
    "calendar",
    "spread",
    "tabs",
    "backdrop",
    "entry",
    "heading",
    "bar",
  ] as const,
  sections: [
    "stats",
    "activity",
    "favorites",
    "recent",
    "watchlist",
    "reviews",
    "lists",
    "diary",
    "watched",
    "likes",
    "comments",
    "list",
    "ratings",
  ] as const,
  scope: "account",
  tempo: TEMPO,
  opening: 0.1,
  inset: 0.05,
  scroll: { period: beat(-1), gain: 1 },
  motion: {
    parts: {
      backdrop: {
        scroll: { to: { y: "13%" }, range: ["0px", "100vh"] },
        slots: {
          screen: {
            origin: "center 38%",
            enter: {
              on: "ready",
              from: { opacity: 0, scale: 1.236 },
              duration: beat(0) + beat(-2),
              ease: DOLLY,
            },
            scroll: { to: { scale: 1.055 }, range: ["0px", "100vh"] },
          },
          picture: {
            enter: {
              on: "ready",
              from: { blur: 34, bright: 0.236, saturate: 0 },
              duration: beat(0),
              ease: FOCUS,
            },
          },
        },
      },
      avatar: { enter: reveal({ opacity: 0, blur: 12 }) },
      tabs: { enter: reveal({ opacity: 0, blur: 8 }) },
      name: { enter: reveal({ opacity: 0, blur: 12 }) },
      bio: { enter: reveal({ opacity: 0, blur: 8 }) },
      section: { enter: reveal({ opacity: 0, blur: 12 }) },
      header: { enter: reveal({ opacity: 0, blur: 8 }) },
      filters: { enter: reveal({ opacity: 0, blur: 8 }) },
      favorite: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      stat: { enter: reveal({ opacity: 0, blur: 8 }) },
      week: {
        enter: reveal({ opacity: 0, blur: 8 }),
      },
      row: { enter: reveal({ opacity: 0, blur: 8 }) },
      calendar: { enter: reveal({ opacity: 0, blur: 8 }) },
      spread: { enter: reveal({ opacity: 0, blur: 8 }) },
      entry: { enter: reveal({ opacity: 0, blur: 8 }) },
      heading: { enter: reveal({ opacity: 0, blur: 8 }) },
      // Histogram bars rise from the baseline, half a star to five.
      bar: {
        origin: "center bottom",
        enter: reveal(
          { scale: [1, 0] },
          { delay: beat(-3), stagger: STAGGER.bar, duration: beat(-2) },
        ),
      },
      review: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      list: {
        enter: reveal({ opacity: 0, blur: 12 }),
      },
      tile: {
        enter: reveal({ opacity: 0, blur: 12 }),
        hover: { scale: 1.015, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
      },
    },
    sections: {
      stats: { enter: reveal({ opacity: 0, blur: 12 }) },
      activity: { enter: reveal({ opacity: 0, blur: 12 }) },
      favorites: { enter: reveal({ opacity: 0, blur: 12 }) },
      recent: { enter: reveal({ opacity: 0, blur: 12 }) },
      watchlist: { enter: reveal({ opacity: 0, blur: 12 }) },
      reviews: { enter: reveal({ opacity: 0, blur: 12 }) },
      lists: { enter: reveal({ opacity: 0, blur: 12 }) },
      diary: { enter: reveal({ opacity: 0, blur: 12 }) },
      watched: { enter: reveal({ opacity: 0, blur: 12 }) },
      likes: { enter: reveal({ opacity: 0, blur: 12 }) },
      comments: { enter: reveal({ opacity: 0, blur: 12 }) },
      list: { enter: reveal({ opacity: 0, blur: 12 }) },
      ratings: { enter: reveal({ opacity: 0, blur: 12 }) },
    },
  },
});

export const ProfileStageRoot = PROFILE.StageRoot;
