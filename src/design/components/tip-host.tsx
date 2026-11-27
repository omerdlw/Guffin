"use client";

import { useEffect } from "react";
import { TOOLTIP } from "@/design/components/tooltip";
import { DOCK_TOOLTIP } from "@/design/theme/dock";

const TRIGGER = "[data-tip], [data-tip-account], .dock-command[aria-label]";
const OFF = ":disabled, [aria-disabled='true']";
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

// Pause before the first tip; then tips follow the pointer at once, and for
// a moment after the last one closes.
const DELAY = 300;
const SKIP = 150;
const ACCOUNT_DELAY = 140;
const PATIENCE = 300;
const MORPH = 340;
const GAP = 10;
const DOCK_GAP = 6;
const PAD = 8;
const SLATE = /^(.*\S)\s+\((\d{4})\)(?:,\s*(.+))?$/;

const BASE = "pointer-events-none w-max";

interface Face {
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  displayName: string;
  followers: number;
  following: number;
  isPrivate: boolean;
  username: string;
}

// What a tip shows: words, optionally a picture (a person or a film) and a
// second line, or an account's card.
interface Spec {
  account?: Face;
  image?: string;
  sub?: string;
  text: string;
}

const faces = new Map<string, Promise<Face | null>>();

function faceOf(username: string): Promise<Face | null> {
  let face = faces.get(username);
  if (!face) {
    face = fetch(`/api/account/card?username=${encodeURIComponent(username)}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<Face>) : null,
      )
      .catch(() => null);
    faces.set(username, face);
    void face.then((found) => {
      if (!found) faces.delete(username);
    });
  }
  return face;
}

const compactCount = (value: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(value);

function part(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}

/**
 * The app's one tooltip: a single element that opens after a pause and then
 * glides between triggers, instead of one closing and the next reopening.
 * Triggers are `[data-tip]` (see `tipProps`) and the dock's icon commands.
 * Geometry is read only when the pointer moves onto a trigger.
 */
export function TipHost(): null {
  useEffect(() => {
    const fine = matchMedia(FINE_POINTER);
    let tip: HTMLElement | null = null;
    let open = false;
    let timer = 0;
    let morphTimer = 0;
    let closedAt = -Infinity;
    let current: HTMLElement | null = null;

    const element = () => {
      if (tip?.isConnected) return tip;
      tip = document.createElement("div");
      tip.setAttribute("aria-hidden", "true");
      tip.dataset.part = "tip";
      tip.dataset.shown = "false";
      Object.assign(tip.style, { left: "0", position: "fixed", top: "0" });
      document.body.append(tip);
      return tip;
    };

    const line = (spec: Spec) => {
      const span = document.createElement("span");
      const face = spec.account;
      if (face) {
        // Banner, avatar across its foot, then who they are and their count.
        span.dataset.layout = "account";
        const name = face.displayName || face.username;
        const slot = (tag: string, kind: string, text?: string) => {
          const element = part(tag, "", text);
          element.dataset.slot = kind;
          return element;
        };
        const banner = face.backgroundUrl
          ? Object.assign(document.createElement("img"), {
              alt: "",
              src: face.backgroundUrl,
            })
          : document.createElement("span");
        banner.dataset.slot = "banner";
        const avatar = face.avatarUrl
          ? Object.assign(document.createElement("img"), {
              alt: "",
              src: face.avatarUrl,
            })
          : part("span", "", name.slice(0, 1));
        avatar.dataset.slot = "avatar";
        const stat = (value: number, label: string) => {
          const cell = document.createElement("span");
          cell.append(
            part("span", "", compactCount(value)),
            part("span", "", label),
          );
          return cell;
        };
        const stats = slot("span", "stats");
        stats.append(
          stat(face.followers, "Followers"),
          stat(face.following, "Following"),
        );
        span.append(
          banner,
          avatar,
          slot("span", "name", name),
          slot(
            "span",
            "handle",
            `@${face.username}${face.isPrivate ? " \u00b7 Private" : ""}`,
          ),
        );
        if (face.bio) span.append(slot("span", "bio", face.bio));
        span.append(stats);
        return span;
      }
      if (spec.image) {
        // A picture alone: the trigger already names who it is.
        span.dataset.layout = "portrait";
        span.append(
          Object.assign(document.createElement("img"), {
            alt: spec.text,
            src: spec.image,
          }),
        );
        return span;
      }
      const slate = SLATE.exec(spec.text);
      if (!slate) {
        span.textContent = spec.text;
        return span;
      }
      const meta = document.createElement("span");
      meta.className = TOOLTIP.meta;
      meta.textContent = slate[3] ? `${slate[2]} \u00b7 ${slate[3]}` : slate[2];
      span.append(slate[1], meta);
      return span;
    };

    // Puts `text` in the tip. While it is open the box morphs from its old
    // size to the new one and the old words fade out under the new ones;
    // otherwise it just takes its size. Returns the size it ends at.
    const fill = (node: HTMLElement, spec: Spec, morph: boolean) => {
      clearTimeout(morphTimer);
      node.querySelectorAll("[data-leaving]").forEach((gone) => gone.remove());
      const from = { height: node.offsetHeight, width: node.offsetWidth };
      const old = morph ? node.firstElementChild : null;
      const next = line(spec);
      const layout = next.dataset.layout;
      node.style.padding =
        layout === "portrait" || layout === "account" ? "6px" : "";
      node.replaceChildren(next);
      node.style.width = "";
      node.style.height = "";
      const to = { height: node.offsetHeight, width: node.offsetWidth };
      if (!old || (from.width === to.width && from.height === to.height)) {
        return to;
      }
      const style = getComputedStyle(node);
      const pad =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      // Lines keep the width they wrap at while the box is between sizes.
      next.style.width = `${to.width - pad}px`;
      next.dataset.entering = "";
      const leaving = old as HTMLElement;
      leaving.style.width = `${from.width - pad}px`;
      leaving.dataset.leaving = "";
      node.append(leaving);
      node.style.width = `${from.width}px`;
      node.style.height = `${from.height}px`;
      void node.offsetWidth;
      node.style.width = `${to.width}px`;
      node.style.height = `${to.height}px`;
      const done = () => {
        leaving.remove();
        next.style.width = "";
        next.removeAttribute("data-entering");
        node.style.width = "";
        node.style.height = "";
      };
      morphTimer = window.setTimeout(done, MORPH);
      return to;
    };

    const place = (control: HTMLElement, spec: Spec) => {
      const node = element();
      const dock =
        control.matches(".dock-command") || control.dataset.tipKind === "dock";
      const kind = dock ? DOCK_TOOLTIP : TOOLTIP.content;
      const same = node.dataset.kind === (dock ? "dock" : "card");
      node.className = `${kind} ${BASE}`;
      node.dataset.kind = dock ? "dock" : "card";
      const { height, width } = fill(node, spec, open && same);
      const box = control.getBoundingClientRect();
      const gap = dock ? DOCK_GAP : GAP;
      const root = document.documentElement;
      let side = control.dataset.tipSide ?? "top";
      const vertical = side === "top" || side === "bottom";
      const need = (vertical ? height : width) + gap + PAD;
      const room: Record<string, number> = {
        bottom: root.clientHeight - box.bottom,
        left: box.left,
        right: root.clientWidth - box.right,
        top: box.top,
      };
      const opposite = {
        bottom: "top",
        left: "right",
        right: "left",
        top: "bottom",
      }[side] as string;
      if (room[side] < need && room[opposite] > room[side]) side = opposite;
      const across = (start: number, size: number, own: number, view: number) =>
        Math.min(
          Math.max(start + (size - own) / 2, PAD),
          Math.max(view - own - PAD, PAD),
        );
      let x: number;
      let y: number;
      if (side === "top" || side === "bottom") {
        x = across(box.left, box.width, width, root.clientWidth);
        y = side === "top" ? box.top - height - gap : box.bottom + gap;
      } else {
        y = across(box.top, box.height, height, root.clientHeight);
        x = side === "left" ? box.left - width - gap : box.right + gap;
      }
      node.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
      node.dataset.side = side;
      node.style.setProperty("--tooltip-transform-origin", "50% 50%");
    };

    const show = (control: HTMLElement, spec: Spec) => {
      current = control;
      place(control, spec);
      const node = tip;
      if (!node || open) return;
      open = true;
      node.dataset.shown = "landing";
      requestAnimationFrame(() => {
        if (open) node.dataset.shown = "true";
      });
    };

    const hide = () => {
      clearTimeout(timer);
      current = null;
      if (!open) return;
      open = false;
      closedAt = performance.now();
      if (tip) tip.dataset.shown = "false";
    };

    const hidden = (control: HTMLElement) =>
      control.hasAttribute("data-cursor-owned") &&
      document.documentElement.classList.contains("reticle") &&
      !control.closest(".ui-motion");

    // What `control` should show; an account's card is fetched, so this can
    // wait on the network (it is started the moment the pointer arrives).
    const specOf = (
      control: HTMLElement,
    ): Promise<Spec | null> | Spec | null => {
      const username = control.dataset.tipAccount;
      if (username) {
        return faceOf(username).then((account) => {
          if (!account) return null;
          // Held until the pictures are in, so the card lands whole.
          const pictures = [account.backgroundUrl, account.avatarUrl].filter(
            (url): url is string => Boolean(url),
          );
          const loaded = Promise.all(
            pictures.map((url) => {
              const image = new Image();
              image.src = url;
              return image.decode().catch(() => undefined);
            }),
          );
          // ...but not for long: a slow picture fills in as it arrives.
          const patience = new Promise((done) => setTimeout(done, PATIENCE));
          return Promise.race([loaded, patience]).then(() => ({
            account,
            text: account.displayName,
          }));
        });
      }
      const text = control.dataset.tip ?? control.getAttribute("aria-label");
      if (!text) return null;
      const image = control.dataset.tipImage;
      if (image) new Image().src = image;
      return { image, sub: control.dataset.tipSub, text };
    };

    const onOver = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === "touch") return;
      const control = (event.target as Element | null)?.closest<HTMLElement>(
        TRIGGER,
      );
      if (!control || control === current) return;
      const found = specOf(control);
      if (!found || control.matches(OFF) || hidden(control)) return hide();
      clearTimeout(timer);
      current = control;
      const run = () =>
        void Promise.resolve(found).then((spec) => {
          if (spec && current === control) show(control, spec);
        });
      if (open || performance.now() - closedAt < SKIP) run();
      else {
        timer = window.setTimeout(
          run,
          control.dataset.tipAccount ? ACCOUNT_DELAY : DELAY,
        );
      }
    };

    const onOut = (event: PointerEvent) => {
      if (!current) return;
      const to = event.relatedTarget as Element | null;
      if (to && current.contains(to)) return;
      if (to?.closest?.(TRIGGER)) return;
      hide();
    };

    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerout", onOut, true);
    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      clearTimeout(morphTimer);
      tip?.remove();
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerout", onOut, true);
      document.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  return null;
}
