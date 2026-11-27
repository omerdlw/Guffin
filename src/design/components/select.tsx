"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useEscapeKey, useScrollLock } from "@omerdlw/base-framework/hooks";
import type { SelectProps } from "@omerdlw/base-framework/ui";
import {
  clamp,
  drive,
  DRAG_SLOP,
  feel,
  glassDepth,
  type Goal,
  spring,
} from "@/design/glass/spring";
import { cn, ui } from "@/design/ui";
import { Icon } from "./icon";

const FAR = feel(300, 0.7);
const NEAR = feel(520, 0.86);
const SIDE = feel(420, 0.8);
const BACK = feel(560, 0.92);
const SHOW = feel(170, 1);
const HIDE = feel(700, 1);

const TRAVEL = feel(380, 0.84);
const FOLLOW = feel(900, 0.95);
const GLASS_ON = feel(620, 0.78);
const GLASS_OFF = feel(200, 0.9);
const JELLY = feel(220, 0.5);
const SWELL_X = 0.035;
const SWELL_Y = 0.3;

const REDUCED = "(prefers-reduced-motion: reduce)";
const NONE = -1;

interface Edges {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface Row {
  disabled: boolean;
  height: number;
  top: number;
}

interface Controller {
  close: () => void;
  key: (event: KeyboardEvent<HTMLButtonElement>) => void;
  listDown: (event: PointerEvent<HTMLDivElement>) => void;
  listHover: (event: PointerEvent<HTMLDivElement>) => void;
  mounted: () => void;
  open: () => void;
  triggerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}

function edgesOf(element: HTMLElement): Edges {
  const box = element.getBoundingClientRect();
  const cx = (box.left + box.right) / 2;
  const cy = (box.top + box.bottom) / 2;
  const w = element.offsetWidth / 2;
  const h = element.offsetHeight / 2;
  return { bottom: cy + h, left: cx - w, right: cx + w, top: cy - h };
}

function rowAt(rows: readonly Row[], y: number) {
  let best = NONE;
  let distance = Infinity;
  rows.forEach((row, index) => {
    if (row.disabled) return;
    const d = Math.abs(row.top + row.height / 2 - y);
    if (d < distance) {
      distance = d;
      best = index;
    }
  });
  return best;
}

export function Select<T extends string = string>({
  ariaLabel,
  className,
  classNames = {},
  collisionPadding = 12,
  defaultValue,
  disabled,
  empty,
  name,
  onChange,
  options,
  placeholder,
  shape,
  size,
  value,
}: SelectProps<T>) {
  const { icons, labels, parts } = ui;
  const listboxId = `select-listbox-${useId()}`;
  const [inner, setInner] = useState(defaultValue);
  const selected = value !== undefined ? value : inner;
  const selectedIndex = options.findIndex(
    (option) => option.value === selected,
  );
  const selectedOption = options[selectedIndex] ?? null;

  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lit, setLit] = useState(NONE);

  const trigger = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const engine = useRef<Controller | null>(null);
  const touched = useRef(false);

  const latest = useRef({
    collisionPadding,
    customWidth: Boolean(classNames.content),
    onChange,
    options,
    selectedIndex,
  });
  useLayoutEffect(() => {
    latest.current = {
      collisionPadding,
      customWidth: Boolean(classNames.content),
      onChange,
      options,
      selectedIndex,
    };
  });

  useEffect(() => {
    const reduced = matchMedia(REDUCED);
    const top = spring();
    const bottom = spring();
    const left = spring();
    const right = spring();
    const reveal = spring();
    const y = spring();
    const h = spring();
    const amount = spring();
    const stretch = spring();

    let state: "closed" | "open" | "closing" = "closed";
    let from: Edges = { bottom: 0, left: 0, right: 0, top: 0 };
    let to: Edges = from;
    let up = false;
    let origin = "0 0";
    let rows: Row[] = [];
    let rowX = 0;
    let rowW = 0;

    let target = NONE;
    let shownLit = NONE;
    let pointer: number | null = null;
    let fromTrigger = false;
    let pressed = false;
    let dragging = false;
    let canDrag = true;
    let tapped = NONE;
    let startX = 0;
    let startY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const light = (index: number) => {
      if (index === shownLit) return;
      shownLit = index;
      setLit(index);
    };
    const aim = (index: number) => {
      target = index;
      light(index);
    };

    const inside = (cx: number, cy: number) =>
      cx >= to.left && cx <= to.right && cy >= to.top && cy <= to.bottom;
    const localY = (cy: number) => cy - to.top + (list.current?.scrollTop ?? 0);

    const goals = (): Goal[] => {
      const closing = state === "closing";
      const edge = closing ? from : to;
      const list: Goal[] = [
        [top, edge.top, closing ? BACK : up ? FAR : NEAR],
        [bottom, edge.bottom, closing ? BACK : up ? NEAR : FAR],
        [left, edge.left, closing ? BACK : SIDE],
        [right, edge.right, closing ? BACK : SIDE],
        [reveal, closing ? 0 : 1, closing ? HIDE : SHOW],
      ];
      const row = rows[target];
      if (row) {
        let ty = row.top;
        if (dragging) {
          const first = rows[0]!;
          const last = rows[rows.length - 1]!;
          ty = clamp(
            localY(pointerY) - h.x / 2,
            first.top,
            last.top + last.height - h.x,
          );
        }
        const on = pressed || dragging;
        list.push(
          [y, ty, dragging ? FOLLOW : TRAVEL],
          [h, row.height, dragging ? FOLLOW : TRAVEL],
          [amount, on ? 1 : 0, on ? GLASS_ON : GLASS_OFF],
          [stretch, clamp(Math.abs(y.v) / 3000, 0, 0.14), JELLY],
        );
      }
      return list;
    };

    const draw = () => {
      const box = shell.current;
      const menu = list.current;
      if (!box || !menu) return;
      const width = Math.max(1, right.x - left.x);
      const height = Math.max(1, bottom.x - top.x);
      const f = (n: number) => n.toFixed(2);
      box.style.visibility = "visible";
      box.style.width = `${f(width)}px`;
      box.style.height = `${f(height)}px`;
      box.style.transform = `translate(${f(left.x)}px, ${f(top.x)}px)`;
      let shown = 1;
      if (state === "closing") {
        const span = to.bottom - to.top - (from.bottom - from.top);
        const grown =
          span > 0 ? (height - (from.bottom - from.top)) / span : reveal.x;
        shown = clamp(grown * 4, 0, 1);
      }
      box.style.opacity = shown.toFixed(3);
      const button = trigger.current;
      if (button) button.style.opacity = (1 - shown).toFixed(3);

      const r = clamp(reveal.x, 0, 1);
      const face = ghost.current;
      if (face) face.style.opacity = (1 - clamp(r * 5, 0, 1)).toFixed(3);
      menu.style.opacity = clamp((r - 0.2) / 0.8, 0, 1).toFixed(3);
      menu.style.transform = `scale(${(0.92 + 0.08 * r).toFixed(4)})`;
      menu.style.transformOrigin = origin;

      const chosenFill = fill.current;
      const glass = lens.current;
      if (!chosenFill || !glass) return;
      if (!rows[target]) {
        chosenFill.style.visibility = "hidden";
        glass.style.visibility = "hidden";
        return;
      }
      const g = clamp(amount.x, 0, 1);
      const sx = 1 + SWELL_X * g - stretch.x * 0.3;
      const sy = 1 + SWELL_Y * g + stretch.x;
      chosenFill.style.visibility = "visible";
      chosenFill.style.width = `${f(rowW)}px`;
      chosenFill.style.height = `${f(h.x)}px`;
      chosenFill.style.transform = `translate(${f(rowX)}px, ${f(y.x)}px)`;
      chosenFill.style.opacity = (1 - g).toFixed(3);
      const lw = rowW * sx;
      const lh = h.x * sy;
      glass.style.visibility = g > 0.004 ? "visible" : "hidden";
      glass.style.width = `${f(lw)}px`;
      glass.style.height = `${f(lh)}px`;
      glass.style.transform = `translate(${f(rowX - (lw - rowW) / 2)}px, ${f(y.x - (lh - h.x) / 2)}px)`;
      glass.style.opacity = clamp(g * 1.6, 0, 1).toFixed(3);
      glass.style.setProperty("--liquid-drop", glassDepth(g));
      if (dragging) light(rowAt(rows, y.x + h.x / 2));
    };

    const settle = () => {
      if (state === "closing") {
        state = "closed";
        trigger.current?.style.removeProperty("opacity");
        setMounted(false);
      }
    };

    const motion = drive(goals, draw, () => reduced.matches);
    const wake = () => motion.wake();
    const watchRest = () => {
      if (state !== "closing") return;
      const done =
        Math.abs(top.x - from.top) < 0.5 &&
        Math.abs(bottom.x - from.bottom) < 0.5 &&
        Math.abs(top.v) < 1 &&
        Math.abs(bottom.v) < 1;
      if (done) settle();
      else requestAnimationFrame(watchRest);
    };

    const place = (fresh: boolean) => {
      const box = shell.current;
      const menu = list.current;
      const button = trigger.current;
      if (!box || !menu || !button) return;
      const { collisionPadding: pad, customWidth } = latest.current;
      from = edgesOf(button);
      const below = innerHeight - from.top - pad;
      const above = from.bottom - pad;
      if (!customWidth) menu.style.width = `${from.right - from.left}px`;
      menu.style.setProperty("--select-room", `${Math.max(below, above, 0)}px`);
      up = menu.offsetHeight > below && above > below;
      menu.style.setProperty(
        "--select-room",
        `${Math.max(0, up ? above : below)}px`,
      );
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const alignEnd =
        from.left + width > innerWidth - pad ||
        (from.left + from.right) / 2 > innerWidth / 2;
      const x = clamp(
        alignEnd ? from.right - width : from.left,
        pad,
        Math.max(pad, innerWidth - pad - width),
      );
      const yTop = up ? from.bottom - height : from.top;
      to = { bottom: yTop + height, left: x, right: x + width, top: yTop };
      menu.style.top = up ? "auto" : "0";
      menu.style.bottom = up ? "0" : "auto";
      menu.style.left = alignEnd ? "auto" : "0";
      menu.style.right = alignEnd ? "0" : "auto";
      const face = ghost.current;
      if (face) {
        face.style.width = `${from.right - from.left}px`;
        face.style.height = `${from.bottom - from.top}px`;
        face.style.top = up ? "auto" : "0";
        face.style.bottom = up ? "0" : "auto";
        face.style.left = alignEnd ? "auto" : `${from.left - x}px`;
        face.style.right = alignEnd ? `${x + width - from.right}px` : "auto";
      }
      const ox = clamp((from.left + from.right) / 2 - x, 0, width);
      origin = `${ox.toFixed(1)}px ${up ? "100%" : "0%"}`;

      const items = Array.from(
        menu.querySelectorAll<HTMLElement>('[role="option"]'),
      );
      rows = items.map((item) => ({
        disabled: item.getAttribute("aria-disabled") === "true",
        height: item.offsetHeight,
        top: item.offsetTop,
      }));
      menu.style.touchAction =
        menu.scrollHeight > menu.clientHeight ? "pan-y" : "none";
      const first = items[0];
      if (first) {
        rowX = first.offsetLeft;
        rowW = first.offsetWidth;
        const outer = parseFloat(getComputedStyle(box).borderTopLeftRadius);
        const inset = Math.min(first.offsetLeft, first.offsetTop);
        const radius = `${Math.max(0, outer - inset)}px`;
        if (fill.current) fill.current.style.borderRadius = radius;
        if (lens.current) lens.current.style.borderRadius = radius;
      }

      if (fresh) {
        const chosen = rows[target];
        if (chosen) {
          menu.scrollTop = chosen.top - (menu.clientHeight - chosen.height) / 2;
        }
        top.x = from.top;
        bottom.x = from.bottom;
        left.x = from.left;
        right.x = from.right;
        top.v = bottom.v = left.v = right.v = 0;
        reveal.x = reveal.v = 0;
        amount.x = amount.v = stretch.x = stretch.v = 0;
        y.x = chosen?.top ?? 0;
        h.x = chosen?.height ?? 0;
        y.v = h.v = 0;
      }
      draw();
      wake();
    };

    const open = () => {
      if (state === "open") return;
      const reopening = state === "closing";
      state = "open";
      const chosen = latest.current.selectedIndex;
      aim(
        chosen >= 0 && !latest.current.options[chosen]?.disabled
          ? chosen
          : NONE,
      );
      setExpanded(true);
      if (reopening) place(false);
      else setMounted(true);
    };

    const close = () => {
      if (state !== "open") return;
      state = "closing";
      pressed = dragging = false;
      pointer = null;
      setExpanded(false);
      const button = trigger.current;
      if (button) from = edgesOf(button);
      if (reduced.matches) {
        settle();
        return;
      }
      wake();
      requestAnimationFrame(watchRest);
    };

    const choose = (index: number) => {
      const { onChange: report, options: all } = latest.current;
      const option = all[index];
      if (!option || option.disabled) return;
      setInner(option.value);
      report?.(option.value, option);
      close();
    };

    const release = (event: globalThis.PointerEvent, cancel: boolean) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      const over = inside(event.clientX, event.clientY);
      const picked = cancel
        ? NONE
        : dragging
          ? over
            ? rowAt(rows, y.x + h.x / 2)
            : NONE
          : fromTrigger
            ? NONE
            : tapped;
      pressed = dragging = false;
      if (picked !== NONE) {
        aim(picked);
        choose(picked);
        return;
      }
      wake();
    };

    const onMove = (event: globalThis.PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (
        canDrag &&
        !dragging &&
        Math.hypot(pointerX - startX, pointerY - startY) > DRAG_SLOP &&
        (!fromTrigger || inside(pointerX, pointerY))
      ) {
        dragging = true;
        pressed = true;
        if (target === NONE) aim(rowAt(rows, localY(pointerY)));
      }
      if (dragging) wake();
    };
    const onUp = (event: globalThis.PointerEvent) => release(event, false);
    const onCancel = (event: globalThis.PointerEvent) => release(event, true);
    const onOutside = (event: globalThis.PointerEvent) => {
      if (state !== "open") return;
      const node = event.target as Node;
      if (trigger.current?.contains(node) || shell.current?.contains(node)) {
        return;
      }
      close();
    };
    const onResize = () => close();

    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onCancel);
    addEventListener("pointerdown", onOutside, true);
    addEventListener("resize", onResize);

    const press = (
      event: PointerEvent<HTMLElement>,
      origin: "trigger" | "menu",
    ) => {
      pointer = event.pointerId;
      fromTrigger = origin === "trigger";
      startX = pointerX = event.clientX;
      startY = pointerY = event.clientY;
      dragging = false;
      canDrag = true;
    };

    const scrollTo = (index: number) => {
      const menu = list.current;
      const row = rows[index];
      if (!menu || !row) return;
      if (row.top < menu.scrollTop) menu.scrollTop = row.top;
      else if (row.top + row.height > menu.scrollTop + menu.clientHeight) {
        menu.scrollTop = row.top + row.height - menu.clientHeight;
      }
    };

    engine.current = {
      close,
      key(event) {
        const step =
          event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        if (step) {
          event.preventDefault();
          if (state !== "open") {
            open();
            return;
          }
          for (
            let index = target + step;
            index >= 0 && index < rows.length;
            index += step
          ) {
            if (rows[index]!.disabled) continue;
            aim(index);
            scrollTo(index);
            wake();
            return;
          }
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (state !== "open") open();
          else if (target !== NONE) choose(target);
          else close();
        }
      },
      listDown(event) {
        event.nativeEvent.stopImmediatePropagation();
        if (event.button !== 0 || state !== "open") return;
        const item = (event.target as Element).closest('[role="option"]');
        const items = list.current?.querySelectorAll('[role="option"]');
        tapped = item && items ? Array.from(items).indexOf(item) : NONE;
        if (tapped !== NONE && rows[tapped]?.disabled) tapped = NONE;
        press(event, "menu");
        if (tapped === NONE) return;
        const menu = list.current;
        const scrolls = menu ? menu.scrollHeight > menu.clientHeight : false;
        if (event.pointerType === "touch" && scrolls) {
          canDrag = false;
          aim(tapped);
          wake();
          return;
        }
        aim(tapped);
        pressed = true;
        wake();
      },
      listHover(event) {
        if (event.pointerType !== "mouse" || pointer !== null) return;
        const item = (event.target as Element).closest('[role="option"]');
        const items = list.current?.querySelectorAll('[role="option"]');
        if (!item || !items) return;
        const index = Array.from(items).indexOf(item);
        if (index === target || rows[index]?.disabled) return;
        aim(index);
        wake();
      },
      mounted: () => place(true),
      open,
      triggerDown(event) {
        if (event.button !== 0) return;
        if (event.pointerType === "touch") return;
        if (state === "open") {
          close();
          return;
        }
        press(event, "trigger");
        open();
      },
    };

    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onCancel);
      removeEventListener("pointerdown", onOutside, true);
      removeEventListener("resize", onResize);
      motion.stop();
      engine.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (mounted) engine.current?.mounted();
  }, [mounted]);

  useScrollLock(mounted);
  useEscapeKey(() => engine.current?.close(), expanded);

  const face = (
    <>
      <span className={parts.select.value({ className: classNames.value })}>
        {selectedOption?.icon ? (
          <Icon
            className={parts.select.icon({ className: classNames.icon })}
            icon={selectedOption.icon}
          />
        ) : null}
        {selectedOption ? (
          <span className={parts.select.label({ className: classNames.label })}>
            {selectedOption.label}
          </span>
        ) : (
          <span
            className={parts.select.placeholder({
              className: classNames.placeholder,
            })}
          >
            {placeholder ?? labels.placeholder}
          </span>
        )}
      </span>
      {icons.chevron ? (
        <Icon
          className={parts.select.chevron({ className: classNames.chevron })}
          icon={icons.chevron}
        />
      ) : null}
    </>
  );
  const triggerClass = parts.select.trigger({
    shape,
    size,
    className: classNames.trigger,
  });

  const menu: ReactNode = mounted ? (
    <div
      className={parts.select.menu({ shape, size, className: classNames.menu })}
      data-cinematic=""
      onPointerDown={(event) => engine.current?.listDown(event)}
      ref={shell}
      style={{ visibility: "hidden" }}
    >
      <div
        aria-hidden="true"
        className={cn(
          triggerClass.replace(/\bliquid-touch\b/g, ""),
          "pointer-events-none absolute bg-transparent shadow-none ring-0",
        )}
        ref={ghost}
      >
        {face}
      </div>
      <div
        className={cn(
          "absolute max-h-[min(16rem,var(--select-room))] overflow-y-auto overscroll-contain",
          size === "sm" ? "p-1" : "p-1.5",
          classNames.content,
        )}
        id={listboxId}
        onPointerMove={(event) => engine.current?.listHover(event)}
        ref={list}
        role="listbox"
      >
        {options.length === 0 ? (
          <div className={parts.select.empty({ className: classNames.empty })}>
            {empty ?? labels.empty}
          </div>
        ) : (
          <>
            <span
              aria-hidden="true"
              className={parts.select.highlight({
                className: classNames.highlight,
              })}
              ref={fill}
              style={{ visibility: "hidden" }}
            />
            {options.map((option, index) => {
              const chosen = option.value === selected;
              return (
                <div
                  aria-disabled={option.disabled || undefined}
                  aria-selected={chosen}
                  className={parts.select.option({
                    shape,
                    size,
                    className: classNames.option,
                  })}
                  data-highlighted={index === lit || undefined}
                  key={option.value}
                  role="option"
                >
                  {chosen && icons.selected ? (
                    <Icon
                      className={parts.select.check({
                        className: classNames.check,
                      })}
                      icon={icons.selected}
                    />
                  ) : null}
                  <span
                    className={parts.select.optionBody({
                      className: classNames.optionBody,
                    })}
                  >
                    {option.icon ? (
                      <Icon
                        className={parts.select.icon({
                          className: classNames.icon,
                        })}
                        icon={option.icon}
                      />
                    ) : null}
                    <span
                      className={parts.select.text({
                        className: classNames.text,
                      })}
                    >
                      <span
                        className={parts.select.label({
                          className: classNames.label,
                        })}
                      >
                        {option.label}
                      </span>
                      {option.description ? (
                        <span
                          className={parts.select.description({
                            className: classNames.description,
                          })}
                        >
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </div>
              );
            })}
            <span
              aria-hidden="true"
              className="liquid liquid-clear pointer-events-none absolute top-0 left-0 z-10 [--liquid-bezel:8] [--liquid-tint:var(--liquid-tint-chosen)] [--rim-fill:var(--rim-chosen-fill)] [--rim-key:var(--rim-chosen-key)] [--rim-shade:var(--rim-chosen-shade)]"
              data-glint="chosen"
              ref={lens}
              style={{ opacity: 0, visibility: "hidden" }}
            />
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={parts.select.root({ className: [classNames.root, className] })}
    >
      {name ? <input name={name} type="hidden" value={selected ?? ""} /> : null}
      <button
        aria-controls={listboxId}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={triggerClass}
        disabled={disabled}
        onClick={(event) => {
          if (event.detail !== 0 && !touched.current) return;
          if (expanded) engine.current?.close();
          else engine.current?.open();
        }}
        onKeyDown={(event) => engine.current?.key(event)}
        onPointerDown={(event) => {
          touched.current = event.pointerType === "touch";
          engine.current?.triggerDown(event);
        }}
        ref={trigger}
        role="combobox"
        type="button"
      >
        {face}
      </button>
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
