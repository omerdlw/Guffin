import type { JSX } from "react";
import { Heading } from "@/features/detail/layout";
import { DetailPart, DetailSection } from "@/features/detail/motion";
import { seasonHref } from "@/lib/project";
import { DockLink } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import { cn } from "@/design/foundations/cn";
import { TONE } from "@/design/foundations/tones";
import { HEATMAP_STEPS } from "./constants";
import type { HeatmapRow } from "./types";
import { heatmapClass } from "./utils";

const LEGEND = [...HEATMAP_STEPS].reverse();

function Legend(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`hidden items-center gap-1.5 ${TONE.label} text-ink-muted sm:flex`}
    >
      Low
      {LEGEND.map((step) => (
        <span
          className={cn("size-3 rounded-mark", step.className)}
          key={step.min}
        />
      ))}
      High
    </span>
  );
}

function cellLabel(season: number, cell: HeatmapRow["cells"][number]) {
  const code = `S${season} · E${cell.episode}`;
  if (cell.count === 0 || cell.average === null)
    return `${code}, not rated yet`;
  return `${code}, ${cell.average.toFixed(1)} from ${cell.count} rating${cell.count === 1 ? "" : "s"}`;
}

/**
 * Members' episode ratings, season by season: one mark per episode, lit in
 * the page's grade by how well it was rated.
 */
export function EpisodeHeatmap({
  rows,
  showId,
}: {
  rows: readonly HeatmapRow[];
  showId: number;
}): JSX.Element | null {
  if (!rows.some((row) => row.cells.some((cell) => cell.count > 0))) {
    return null;
  }
  let index = 0;

  return (
    <DetailSection className="flex w-full flex-col" cue="heatmap">
      <Heading
        actions={<Legend />}
        icon="solar:chart-square-bold"
        title="Episode ratings"
      />
      <div
        className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        data-scroll-native=""
      >
        <ol className="flex w-max flex-col gap-1.5">
          {rows.map((row, at) => (
            <li className="flex items-center gap-1.5" key={row.season}>
              <DetailPart className="w-10 shrink-0" index={at} name="readout">
                <DockLink
                  className={`${TONE.label} text-ink-muted hover:text-ink focus-visible:text-ink tabular-nums`}
                  href={seasonHref(showId, row.season)}
                >
                  S{row.season}
                </DockLink>
              </DetailPart>
              {row.cells.map((cell) => {
                const label = cellLabel(row.season, cell);
                return (
                  <DetailPart
                    className="shrink-0"
                    index={index++}
                    key={cell.episode}
                    name="tile"
                  >
                    <Tooltip position="top" text={label}>
                      <span
                        aria-label={label}
                        className={cn(
                          "center size-8 cursor-help rounded-mark type-micro font-semibold tabular-nums",
                          heatmapClass(cell.count > 0 ? cell.average : null),
                        )}
                        role="img"
                      >
                        {cell.count > 0 && cell.average !== null
                          ? cell.average.toFixed(1)
                          : cell.episode}
                      </span>
                    </Tooltip>
                  </DetailPart>
                );
              })}
            </li>
          ))}
        </ol>
      </div>
    </DetailSection>
  );
}
