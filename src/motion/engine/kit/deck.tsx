"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  OwnedScope,
  ScopeGeneration,
  ScopeProvider,
  useAnyStage,
  useScope,
  useSectionOf,
} from "../react";
import { childScope } from "../stage";

// Views of one place that stay mounted while hidden (a carousel keeps its
// scroll, a form its input). Switching sends the shown view's parts off by
// their own verbs, then brings the next view in.
//
// With a `cue` a view is one section, owned by the deck: a switched-to view
// plays at once, the eye is already on it. Without one a view is a column of
// its own sections: each is a child of the view, the whole view leaves
// together, and on the way back every section is put in the dark and played
// again as it is reached, as on the first visit.

export interface DeckProps<K extends string> {
  views: Record<K, ReactNode>;
  shown: K;
  cue?: string;
  className?: string;
  viewClassName?: string;
  // Called as the next view comes in: a page can bring the deck into view.
  onSwitch?: (view: K) => void;
}

export function Deck<K extends string>({
  views,
  shown,
  cue,
  className,
  viewClassName,
  onSwitch,
}: DeckProps<K>) {
  const stage = useAnyStage();
  const base = childScope(useScope(), useId());
  const [visible, setVisible] = useState(shown);
  const [first] = useState(shown);
  const [generations, setGenerations] = useState<Partial<Record<K, number>>>(
    {},
  );
  const switching = useRef(false);
  const last = useRef(shown);
  const wanted = useRef(shown);
  const latest = useRef(onSwitch);

  useEffect(() => {
    wanted.current = shown;
    latest.current = onSwitch;
  });

  const scopeOf = (view: K) => `${base}${view}`;

  useEffect(() => {
    if (shown === visible || switching.current) return;
    switching.current = true;
    void stage.dismiss(scopeOf(visible)).then(() => {
      switching.current = false;
      setVisible(wanted.current);
    });
  }, [shown, visible]);

  useLayoutEffect(() => {
    // The first view is reached by the scroll like any section; only
    // switches are played here.
    if (last.current === visible) return;
    last.current = visible;
    latest.current?.(visible);
    if (cue) {
      stage.recue(cue, scopeOf(visible));
      return;
    }
    stage.reset(scopeOf(visible));
    setGenerations((current) => ({
      ...current,
      [visible]: (current[visible] ?? 0) + 1,
    }));
  }, [visible]);

  const trigger = useSectionOf(stage, cue ?? "", scopeOf(first));
  const keys = Object.keys(views) as K[];

  return (
    <div className={className}>
      {keys.map((key) => (
        <ScopeProvider key={key} value={scopeOf(key)}>
          <OwnedScope value={Boolean(cue)}>
            <ScopeGeneration value={generations[key] ?? 0}>
              <div
                className={viewClassName}
                hidden={key !== visible}
                ref={cue && key === first ? trigger : undefined}
              >
                {views[key]}
              </div>
            </ScopeGeneration>
          </OwnedScope>
        </ScopeProvider>
      ))}
    </div>
  );
}
