"use client";

import type { JSX } from "react";
import { Count, type CountProps } from "./kit/count";
import { Deck, type DeckProps } from "./kit/deck";
import { Expose, type ExposeProps } from "./kit/expose";
import { Header, type HeaderProps } from "./kit/header";
import { Swap, type SwapProps } from "./kit/swap";
import { WallStage, type WallStageProps } from "./kit/wall";
import { bindStage } from "./react";
import type { Score } from "./score";

type Named<T, K extends keyof T, N> = Omit<T, K> & { [key in K]: N };

// Binds a score to React once: the stage, its hooks, and the kit, all typed
// with the score's own part and section names.
export function bindScore<P extends string, S extends string = never>(
  score: Score<P, S>,
) {
  return {
    ...bindStage(score),
    Header: Header as (props: Named<HeaderProps, "part", P>) => JSX.Element,
    Expose: Expose as (props: Named<ExposeProps, "part", P>) => JSX.Element,
    Count: Count as (props: Named<CountProps, "part", P>) => JSX.Element,
    Swap: Swap as (props: Named<SwapProps, "cue", S>) => JSX.Element,
    // A deck without a cue is a column of the page's own sections.
    Deck: Deck as <K extends string>(
      props: Omit<DeckProps<K>, "cue"> & { cue?: S },
    ) => JSX.Element,
    WallStage: WallStage as (
      props: Named<WallStageProps, "cue", S>,
    ) => JSX.Element,
  };
}
