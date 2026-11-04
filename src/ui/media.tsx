"use client";

import {
  Children,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  type SVGProps,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon as IconifyIcon } from "@iconify-icon/react";
import { useTheme } from "@omerdlw/base-framework/theme";
import { trimToNull } from "@omerdlw/base-framework/utils";
import Link from "next/link";
import { Value } from "@/motion/engine";
import { StagePart, useEngine } from "@/motion/react";
import { CURVE } from "@/motion/time";
import { step } from "@/motion/utils";
import { Button, useDockLinkClick } from "./button";
import { cn } from "./cn";
import { Tooltip } from "./feedback";
import { primitivesTheme } from "./theme";
import { TONE } from "./tokens";

interface IconProps extends Omit<
  ComponentProps<typeof IconifyIcon>,
  "icon" | "size"
> {
  color?: string;
  icon: ComponentProps<typeof IconifyIcon>["icon"];
  size?: number | string;
}

export function Icon({
  className = "center",
  color,
  icon,
  size = 20,
  ...props
}: IconProps) {
  return (
    <IconifyIcon
      className={className}
      height={size}
      icon={icon}
      style={{ color, height: size, width: size }}
      width={size}
      {...props}
    />
  );
}

export const LOGO_VIEWBOX = "0 0 1704 1704";
export const LOGO_PATH =
  "M802 1703C750 1701 702 1696 662 1689C648 1686 647 1686 648 1685C648 1685 653 1683 658 1681C669 1677 692 1669 697 1667C699 1666 706 1663 714 1660C731 1653 767 1635 788 1623C873 1576 937 1523 1001 1448C1036 1408 1061 1372 1094 1314C1110 1285 1134 1234 1146 1202C1157 1173 1164 1155 1168 1142C1177 1110 1178 1105 1178 1104C1177 1104 1106 1104 1018 1104L859 1104L859 962L859 819L1276 819L1694 819L1694 843C1694 880 1692 926 1690 942C1690 946 1689 952 1688 956C1688 962 1684 993 1681 1012C1679 1022 1670 1063 1666 1081C1656 1122 1640 1167 1626 1198C1623 1206 1620 1214 1618 1218C1613 1232 1582 1291 1569 1313C1529 1377 1486 1431 1436 1478C1416 1496 1414 1498 1391 1516C1375 1529 1341 1554 1324 1565C1312 1573 1283 1590 1268 1598C1257 1604 1222 1621 1222 1621C1221 1621 1218 1622 1214 1624C1186 1637 1146 1652 1117 1661C1112 1663 1104 1665 1101 1666C1092 1669 1060 1677 1045 1681C1007 1689 945 1698 908 1700C903 1701 896 1701 894 1702C888 1702 854 1703 835 1703C828 1703 813 1703 802 1703ZM484 1545C458 1543 428 1537 402 1529C353 1515 308 1491 262 1455C240 1438 202 1401 183 1378C162 1351 144 1326 134 1310C133 1307 130 1302 128 1298C114 1277 89 1226 76 1194C60 1153 49 1120 38 1077C26 1027 18 978 15 940C12 903 12 903 10 864C10 850 11 811 13 784C17 729 30 654 45 604C49 590 63 549 67 538C86 488 104 451 131 403C158 357 203 295 236 260C288 205 331 168 381 134C405 117 442 95 463 84C503 64 541 48 586 34C605 29 630 22 642 20C646 19 656 17 664 15C681 11 718 6 748 3C768 1 774 0 820 0C874 0 881 1 923 6C951 10 959 11 978 14C1001 19 1038 27 1038 28C1038 28 1030 31 1020 34C984 46 928 73 890 95C824 135 766 181 715 234C688 262 684 266 668 286C661 296 652 307 649 310C631 333 604 374 584 409C553 462 533 507 512 572C499 611 488 657 482 695C474 748 471 787 471 842C471 879 475 928 480 965C483 980 490 1015 495 1034C501 1059 518 1112 528 1134C536 1153 554 1192 559 1200C560 1202 564 1209 567 1214C575 1229 590 1254 596 1262C622 1299 640 1321 671 1352C707 1388 742 1416 783 1440C787 1442 791 1444 791 1444C791 1445 787 1448 783 1451C778 1454 769 1461 762 1465C741 1481 723 1492 700 1504C667 1520 640 1529 599 1538C571 1544 559 1545 522 1546C504 1546 486 1546 484 1545ZM1124 523C1105 486 1073 437 1044 402C1023 378 984 338 969 327C967 326 963 322 960 319C953 314 925 294 914 287C910 284 904 280 900 279C896 277 893 275 893 274C892 273 902 264 916 254C960 221 1012 197 1069 182C1114 171 1172 168 1223 175C1236 176 1264 182 1279 186C1306 192 1352 211 1376 225C1436 259 1486 302 1532 359C1549 380 1572 414 1585 438C1601 467 1616 498 1627 524C1629 528 1631 533 1631 535L1633 539L1382 539L1132 539L1124 523Z";

interface LogoProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  size?: number | string;
}

export function Logo({ size = 24, ...props }: LogoProps) {
  return (
    <svg
      aria-hidden
      fill="currentColor"
      height={size}
      viewBox={LOGO_VIEWBOX}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={LOGO_PATH} />
    </svg>
  );
}

interface AdaptiveImageProps extends Omit<
  ComponentPropsWithoutRef<"img">,
  "src" | "alt"
> {
  alt?: string;
  fallback?: ReactNode;
  fill?: boolean;
  priority?: boolean;
  src?: string | null;
  wrapperClassName?: string;
}

export function AdaptiveImage({
  alt = "",
  className,
  crossOrigin,
  decoding = "async",
  fallback,
  fetchPriority,
  fill,
  loading,
  onError,
  onLoad,
  priority = false,
  src,
  wrapperClassName,
  ...props
}: AdaptiveImageProps) {
  const theme = useTheme(primitivesTheme);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const resolvedSrc = trimToNull(src);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const corsRefused = refused !== null && refused === resolvedSrc;

  useEffect(() => {
    const image = imageRef.current;
    setHasLoaded(Boolean(image?.complete && image.naturalWidth > 0));
    setHasFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || (hasFailed && fallback)) {
    return fallback ? (
      <div
        className={cn(theme.slots.adaptiveImageFallback, wrapperClassName)}
        suppressHydrationWarning
      >
        {fallback}
      </div>
    ) : null;
  }

  const handleLoad = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasLoaded(true);
    setHasFailed(false);
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (crossOrigin && !corsRefused) {
      setRefused(resolvedSrc);
      return;
    }
    setHasFailed(true);
    onError?.(event);
  };

  return (
    <div
      className={cn(
        theme.slots.adaptiveImageFrame,
        !hasLoaded && !hasFailed && "skeleton-block",
        wrapperClassName,
      )}
      suppressHydrationWarning
    >
      <img
        ref={imageRef}
        src={resolvedSrc}
        alt={alt}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className={cn(theme.slots.adaptiveImage, className)}
        crossOrigin={corsRefused ? undefined : crossOrigin}
        data-fill={(fill ?? (!props.width && !props.height)) || undefined}
        data-state={hasLoaded ? "loaded" : "loading"}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading || (priority ? "eager" : "lazy")}
        fetchPriority={fetchPriority || (priority ? "high" : undefined)}
        decoding={decoding}
        suppressHydrationWarning
        {...props}
      />
    </div>
  );
}

interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  fallback?: ReactNode;
  name?: string;
  ref?: Ref<HTMLSpanElement>;
  size?: number | string;
  src?: string | null;
}

function initialsOf(name?: string): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  alt,
  children,
  className,
  fallback,
  name,
  ref,
  size = 36,
  src,
  style,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const theme = useTheme(primitivesTheme);
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      ref={ref}
      style={{ height: dimension, width: dimension, ...style }}
      className={cn(theme.slots.avatar, className)}
      {...props}
    >
      {src && src !== failedSrc ? (
        <AdaptiveImage
          src={src}
          alt={alt || name || "Avatar"}
          onError={() => setFailedSrc(src)}
          className={theme.slots.avatarImage}
        />
      ) : (
        <span className={theme.slots.avatarFallback}>
          {fallback ?? children ?? initialsOf(name || alt)}
        </span>
      )}
    </span>
  );
}

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

export function BackdropHeroSkeleton({ className }: { className?: string }) {
  const theme = useTheme(primitivesTheme);

  return (
    <div aria-hidden="true" className={cn(theme.slots.backdropHero, className)}>
      <div
        className="skeleton-block absolute inset-0"
        style={BACKDROP_HERO_MASK}
      />
    </div>
  );
}

const ASPECT = {
  free: "",
  poster: "aspect-[2/3]",
  square: "aspect-square",
  video: "aspect-video",
} as const;

export type MediaCardAspect = keyof typeof ASPECT;

interface MediaCardImage {
  crossOrigin?: "anonymous";
  priority?: boolean;
  sizes?: string;
  src: string | null;
  srcSet?: string;
}

type DataAttributes = { [key: `data-${string}`]: string | undefined };

interface MediaCardProps extends DataAttributes {
  aspect?: MediaCardAspect;
  caption?: ReactNode;
  className?: string;
  fallbackIcon?: string;
  fallbackIconSize?: number;
  frameClassName?: string;
  framed?: boolean;
  href?: string;
  image: MediaCardImage;
  label?: string;
  onNavigated?: () => void;
  onClick?: () => void;
  overlay?: ReactNode;
  radius?: number | string;
  tooltip?: string;
}

export function MediaCard({
  aspect = "poster",
  caption,
  className,
  fallbackIcon = "solar:gallery-bold",
  fallbackIconSize = 22,
  frameClassName,
  framed = true,
  href,
  image,
  label,
  onClick,
  onNavigated,
  overlay,
  radius,
  tooltip,
  ...rest
}: MediaCardProps) {
  const style: CSSProperties = { borderRadius: radius };
  const classes = cn(
    "cine-card group/media flex min-w-0 flex-col gap-1.5 outline-none",
    aspect !== "free" && "w-full",
    className,
  );

  const body = (
    <>
      <div
        className={cn(
          "cine-fade relative isolate overflow-hidden",
          ASPECT[aspect],
          framed && "bg-fill",
          frameClassName,
        )}
        data-cursor-frame=""
        style={style}
      >
        <AdaptiveImage
          alt=""
          className="cine-zoom object-cover"
          crossOrigin={image.crossOrigin}
          fallback={
            <div className="center h-full w-full text-ink-faint">
              <Icon icon={fallbackIcon} size={fallbackIconSize} />
            </div>
          }
          fetchPriority={image.priority ? "high" : undefined}
          loading={image.priority ? "eager" : undefined}
          sizes={image.sizes}
          src={image.src}
          srcSet={image.srcSet}
        />
        {overlay}
        {framed ? (
          <>
            <span aria-hidden="true" className="cine-afterglow" />
            <span
              aria-hidden="true"
              className="cine-fade pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-edge ring-inset group-focus-visible/media:ring-edge-focus in-data-active:ring-edge-focus"
            />
          </>
        ) : null}
      </div>
      {caption}
    </>
  );

  let card: ReactNode;
  if (href) {
    card = (
      <LinkCard
        className={classes}
        data-cursor="card"
        data-cursor-label={tooltip}
        href={href}
        label={label}
        onNavigated={onNavigated}
        style={style}
        {...rest}
      >
        {body}
      </LinkCard>
    );
  } else if (onClick) {
    card = (
      <button
        {...rest}
        aria-label={label}
        className={cn(classes, "cursor-pointer text-left")}
        data-cursor="card"
        data-cursor-label={tooltip}
        onClick={onClick}
        style={style}
        type="button"
      >
        {body}
      </button>
    );
  } else {
    card = (
      <div className={classes} style={style}>
        {body}
      </div>
    );
  }

  return tooltip ? (
    <Tooltip data-cursor-owned="" position="top" text={tooltip}>
      {card}
    </Tooltip>
  ) : (
    card
  );
}

function LinkCard({
  children,
  className,
  href,
  label,
  onNavigated,
  style,
  ...rest
}: {
  children: ReactNode;
  className: string;
  href: string;
  label?: string;
  onNavigated?: () => void;
  style: CSSProperties;
} & DataAttributes) {
  const handleClick = useDockLinkClick(href, onNavigated);
  return (
    <Link
      {...rest}
      aria-label={label}
      className={className}
      href={href}
      onClick={handleClick}
      prefetch={false}
      style={style}
    >
      {children}
    </Link>
  );
}

const EDGE_TOLERANCE = 4;
const DRAG_THRESHOLD = 5;
const SCROLL_STEP = 0.8;
const GLIDE_RUNG = 2;
const ARROW_RUNG = 1;

interface ScrollState {
  left: boolean;
  right: boolean;
}

function readScroll(track: HTMLElement): ScrollState {
  return {
    left: track.scrollLeft > EDGE_TOLERANCE,
    right:
      track.scrollLeft + track.clientWidth < track.scrollWidth - EDGE_TOLERANCE,
  };
}

function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const track = ref.current;
    if (!track) return;
    let startX = 0;
    let startLeft = 0;
    let pressed = false;
    let dragged = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pressed = true;
      dragged = false;
      startX = event.clientX;
      startLeft = track.scrollLeft;
    };
    const onMove = (event: PointerEvent) => {
      if (!pressed) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) > DRAG_THRESHOLD) {
        dragged = true;
        track.dataset.dragging = "true";
      }
      if (dragged) track.scrollLeft = startLeft - delta;
    };
    const onUp = () => {
      pressed = false;
      delete track.dataset.dragging;
    };
    const onClickCapture = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("click", onClickCapture, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [ref]);
}

function glideTarget(track: HTMLElement, direction: -1 | 1): number {
  const max = track.scrollWidth - track.clientWidth;
  const wanted = track.scrollLeft + track.clientWidth * SCROLL_STEP * direction;
  const edges = Array.from(
    track.children,
    (child) => (child as HTMLElement).offsetLeft - track.offsetLeft,
  ).filter((edge) => edge <= max);
  if (edges.length === 0) return Math.min(max, Math.max(0, wanted));

  let target = edges.reduce((best, edge) =>
    Math.abs(edge - wanted) < Math.abs(best - wanted) ? edge : best,
  );
  if (direction === 1 && target <= track.scrollLeft + EDGE_TOLERANCE)
    target =
      edges.find((edge) => edge > track.scrollLeft + EDGE_TOLERANCE) ?? max;
  if (direction === -1 && target >= track.scrollLeft - EDGE_TOLERANCE)
    target =
      [...edges]
        .reverse()
        .find((edge) => edge < track.scrollLeft - EDGE_TOLERANCE) ?? 0;
  if (direction === 1 && max - target < track.clientWidth * 0.25) target = max;
  if (direction === -1 && target < track.clientWidth * 0.25) target = 0;
  return target;
}

const ARROW_CLASS =
  "center absolute top-1/2 z-10 size-9 -translate-y-1/2 transition-[opacity,scale,background-color] ease-out-expo cursor-pointer sm:size-10";

const ARROW_STYLE = {
  transitionDuration: `calc(${step(ARROW_RUNG)}s * var(--tempo, 1))`,
};

const arrowState = (visible: boolean) =>
  visible ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-75";

interface CarouselProps {
  part: string;
  children: ReactNode;
  arrowClassName?: string;
  className?: string;
  itemClassName?: string;
  label?: string;
  onNearEnd?: () => void;
}

export function Carousel({
  part,
  children,
  arrowClassName = TONE.arrows,
  className,
  itemClassName,
  label,
  onNearEnd,
}: CarouselProps) {
  const engine = useEngine();
  const track = useRef<HTMLDivElement>(null);
  const glide = useRef<Value | null>(null);
  const [scroll, setScroll] = useState<ScrollState>({
    left: false,
    right: false,
  });
  const [settled, setSettled] = useState(false);
  const settledRef = useRef(false);
  const nearEnd = useRef(onNearEnd);
  useDragScroll(track);

  useEffect(() => {
    nearEnd.current = onNearEnd;
  });

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    if (
      el.clientWidth > 0 &&
      el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth
    )
      nearEnd.current?.();
    const next = readScroll(el);
    setScroll((previous) =>
      previous.left === next.left && previous.right === next.right
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, children]);

  const stopGlide = () => glide.current?.stop();

  const scrollBy = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const target = glideTarget(el, direction);
    if (engine.reduced.get()) {
      el.scrollLeft = target;
      return;
    }
    const value = (glide.current ??= new Value(engine.clock));
    value.stop();
    value.set(el.scrollLeft);
    const stop = value.subscribe((left) => {
      el.scrollLeft = left;
    });
    void value
      .to(target, { tween: step(GLIDE_RUNG), curve: CURVE.dolly })
      .then(stop);
  };

  const onSlide = (index: number) =>
    index === 0
      ? (_look: unknown, state: { enter: number }) => {
          if (settledRef.current || state.enter < 1) return;
          settledRef.current = true;
          setSettled(true);
        }
      : undefined;

  const left = settled && scroll.left;
  const right = settled && scroll.right;

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="relative w-full"
      role="group"
    >
      <div
        className={cn(
          "flex cursor-grab touch-pan-y gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain select-none data-[dragging=true]:cursor-grabbing",
          className,
        )}
        data-cursor="drag"
        data-rack=""
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={stopGlide}
        onScroll={sync}
        onTouchStart={stopGlide}
        onWheel={stopGlide}
        ref={track}
      >
        {Children.toArray(children).map((child, index) => (
          <StagePart
            className={cn("cine-slide shrink-0", itemClassName)}
            css
            index={index}
            key={(child as { key?: string }).key ?? index}
            name={part}
            render={onSlide(index)}
          >
            {child}
          </StagePart>
        ))}
      </div>

      <Button
        aria-hidden={!left}
        aria-label="Scroll left"
        className={cn(
          ARROW_CLASS,
          arrowClassName,
          "left-2 sm:left-3",
          arrowState(left),
        )}
        onClick={() => scrollBy(-1)}
        style={ARROW_STYLE}
        tabIndex={left ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-left-bold" size={18} />
      </Button>
      <Button
        aria-hidden={!right}
        aria-label="Scroll right"
        className={cn(
          ARROW_CLASS,
          arrowClassName,
          "right-2 sm:right-3",
          arrowState(right),
        )}
        onClick={() => scrollBy(1)}
        style={ARROW_STYLE}
        tabIndex={right ? 0 : -1}
      >
        <Icon icon="solar:alt-arrow-right-bold" size={18} />
      </Button>
    </div>
  );
}
