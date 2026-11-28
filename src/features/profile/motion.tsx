"use client";

import {
  DOLLY,
  FOCUS,
  SETTLE,
  TEMPO,
  TOUCH,
  beat,
  reveal,
  rise,
} from "@/motion/choreography/pace";
import { defineStage } from "@/motion/choreography/stage";

const STAGGER = { bar: 0.034 };

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
      avatar: { enter: rise(1) },
      tabs: { enter: rise(2) },
      name: { enter: rise(1) },
      bio: { enter: rise(2) },
      section: { enter: rise(1) },
      header: { enter: rise(2) },
      filters: { enter: rise(2) },
      favorite: {
        enter: rise(1),
      },
      stat: { enter: rise(2) },
      week: {
        enter: rise(2),
      },
      row: { enter: rise(2) },
      calendar: { enter: rise(2) },
      spread: { enter: rise(2) },
      entry: { enter: rise(2) },
      heading: { enter: rise(2) },
      // Histogram bars rise from the baseline, half a star to five.
      bar: {
        origin: "center bottom",
        enter: reveal(
          { scale: [1, 0] },
          { delay: beat(-3), stagger: STAGGER.bar, duration: beat(-2) },
        ),
      },
      review: {
        enter: rise(1),
      },
      list: {
        enter: rise(1),
      },
      tile: {
        enter: rise(1),
        hover: { scale: 1.015, duration: beat(-2), ease: TOUCH },
        rest: { duration: beat(-1), ease: SETTLE },
      },
    },
    sections: {
      stats: { enter: rise(1) },
      activity: { enter: rise(1) },
      favorites: { enter: rise(1) },
      recent: { enter: rise(1) },
      watchlist: { enter: rise(1) },
      reviews: { enter: rise(1) },
      lists: { enter: rise(1) },
      diary: { enter: rise(1) },
      watched: { enter: rise(1) },
      likes: { enter: rise(1) },
      comments: { enter: rise(1) },
      list: { enter: rise(1) },
      ratings: { enter: rise(1) },
    },
  },
});

export const ProfileStageRoot = PROFILE.StageRoot;
