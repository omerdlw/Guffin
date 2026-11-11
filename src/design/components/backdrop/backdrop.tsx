import { cn } from "../../foundations/cn";
import { SKELETON } from "../skeleton";

export const SIDE_COVER: readonly [number, number][] = [
  [0, 100],
  [2, 97],
  [5, 90],
  [8, 79],
  [12, 64],
  [16, 47],
  [20, 30],
  [24, 15],
  [27, 4],
  [30, 0],
];

export const BOTTOM_COVER: readonly [number, number][] = [
  [0, 0],
  [28, 0],
  [38, 3],
  [48, 10],
  [58, 22],
  [68, 42],
  [78, 68],
  [88, 88],
  [95, 98],
  [100, 100],
];

const mirror = (stops: readonly [number, number][]) =>
  stops.map(([at, cover]) => [100 - at, cover] as const).reverse();

function fade(at: (cover: number) => string): string[] {
  const stops = (list: readonly (readonly [number, number])[]) =>
    list.map(([position, cover]) => `${at(cover)} ${position}%`).join(", ");
  return [
    `linear-gradient(to right, ${stops([...SIDE_COVER, ...mirror(SIDE_COVER.slice(0, -1))])})`,
    `linear-gradient(to bottom, ${stops(BOTTOM_COVER)})`,
  ];
}

const MASK = fade((cover) => `rgb(0 0 0 / ${(100 - cover) / 100})`).join(", ");

export const BACKDROP_HERO_MASK = {
  maskComposite: "intersect",
  maskImage: MASK,
  WebkitMaskComposite: "source-in",
  WebkitMaskImage: MASK,
} as const;

export const BACKDROP_HERO =
  "relative isolate h-80 w-[calc(100%+2rem)] -translate-x-4 overflow-hidden sm:h-96 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(36rem,52vw,44rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32 xl:h-[clamp(40rem,56vw,48rem)] xl:w-[calc(100%+24rem)] xl:-translate-x-48";

export function BackdropHeroSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn(BACKDROP_HERO, className)}>
      <div
        className={cn(SKELETON.block, "absolute inset-0")}
        style={BACKDROP_HERO_MASK}
      />
    </div>
  );
}
