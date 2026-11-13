import {
  type NavigationTrip,
  pathOf,
} from "@omerdlw/base-framework/navigation";

export const LAYER_MEMORY_MS = 750;

const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

export const raised = new WeakMap<Element, { at: number; layer: boolean }>();

export function setMask(el: HTMLElement, image: string) {
  el.style.setProperty("mask-image", image);
  el.style.setProperty("-webkit-mask-image", image);
}

export function clearMask(el: HTMLElement) {
  el.style.removeProperty("mask-image");
  el.style.removeProperty("-webkit-mask-image");
}

export const changesPage = (trip: NavigationTrip) =>
  pathOf(trip.to) !== pathOf(trip.from);

export const plainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export function leavesPage(link: HTMLAnchorElement) {
  if (link.target && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  const url = new URL(link.href, location.href);
  return url.origin === location.origin && url.pathname !== location.pathname;
}

export const topOf = (el: HTMLElement) => {
  const box = el.getBoundingClientRect();
  return Math.round(box.top + scrollY) + box.left / 1e5;
};

export function lines(spans: readonly HTMLElement[]) {
  const tops: number[] = [];
  return spans.map((span) => {
    const top = span.offsetTop;
    let line = tops.findIndex((at) => Math.abs(at - top) < 2);
    if (line === -1) line = tops.push(top) - 1;
    return line;
  });
}

export function layoutTop(element: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

export const isFilmPage = (href: string): boolean =>
  FILM_PAGE.test(pathOf(href));
