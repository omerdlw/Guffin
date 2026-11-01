"use client";

import { useEffect, useMemo, useRef, type JSX } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/ui/cn";
import { EASE, size } from "@/motion/stage";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { Icon, TONE } from "@/ui";
import type { Laureate } from "../types";

export function WinnersIndex({
  current,
  laureates,
  onClose,
  onPick,
  open,
}: {
  current: number;
  laureates: Laureate[];
  onClose: () => void;
  onPick: (index: number) => void;
  open: boolean;
}): JSX.Element {
  const panel = useRef<HTMLDivElement>(null);
  const decades = useMemo(() => {
    const groups = new Map<number, { film: Laureate; index: number }[]>();
    laureates.forEach((film, index) => {
      const decade = Math.floor(film.ceremonyYear / 10) * 10;
      groups.set(decade, [...(groups.get(decade) ?? []), { film, index }]);
    });
    return [...groups.entries()];
  }, [laureates]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panel.current
      ?.querySelector<HTMLElement>("[aria-current=true]")
      ?.focus({ preventScroll: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label="All Best Picture winners"
          aria-modal="true"
          className="fixed inset-0 z-20 overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-xl"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          ref={panel}
          role="dialog"
          transition={{ duration: size(1), ease: EASE.fade }}
        >
          <div className="mx-auto w-full max-w-[96rem] px-4 pt-6 pb-[calc(var(--dock-h,6rem)+2rem)] sm:px-8 sm:pt-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className={cn(TONE.label, "text-award/80")}>Best Picture</p>
                <p className="mt-1.5 type-body text-ink-muted">
                  {laureates.length} winners, by ceremony
                </p>
              </div>
              <button
                aria-label="Close"
                className="inline-flex size-10 items-center justify-center rounded-full bg-fill text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover hover:text-ink"
                onClick={onClose}
                type="button"
              >
                <Icon icon="solar:close-circle-bold" size={18} />
              </button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {decades.map(([decade, films], column) => (
                <motion.section
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  key={decade}
                  transition={{
                    delay: 0.1 + column * 0.04,
                    duration: size(1),
                    ease: EASE.fade,
                  }}
                >
                  <h3 className="font-zuume type-display-xs leading-none font-bold text-award/70">
                    {decade}s
                  </h3>
                  <ol className="mt-3 flex flex-col">
                    {films.map(({ film, index }) => (
                      <li key={film.ceremony}>
                        <button
                          aria-current={index === current ? "true" : undefined}
                          className={cn(
                            "group/winner flex w-full items-center gap-3 py-1.5 text-left",
                            index === current
                              ? "text-award"
                              : "text-ink-body hover:text-ink",
                          )}
                          onClick={() => onPick(index)}
                          type="button"
                        >
                          <img
                            alt=""
                            className="h-9 w-6 shrink-0 object-cover opacity-70 group-hover/winner:opacity-100"
                            loading="lazy"
                            src={tmdbImageUrl(
                              "poster",
                              film.posterPath,
                              "w92",
                            )!}
                          />
                          <span className="w-10 shrink-0 type-meta font-semibold tabular-nums opacity-70">
                            {film.ceremonyYear}
                          </span>
                          <span className="min-w-0 truncate type-body font-medium">
                            {film.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </motion.section>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
