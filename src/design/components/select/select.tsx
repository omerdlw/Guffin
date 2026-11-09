"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useControllableState,
  useEscapeKey,
} from "@omerdlw/base-framework/hooks";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { createPortal } from "react-dom";
import { POINTS } from "@/motion/constants";
import { step } from "@/motion/utils";
import { cn } from "../../foundations/cn";
import { Icon } from "../icon";
import { SlidingHighlight } from "../indicator";
import {
  selectMenuVariants,
  selectOptionVariants,
  selectTriggerVariants,
  type SelectVariants,
} from "./variants";

const ICON = "ui-glyph shrink-0 text-ink-body";

export interface SelectOption<T extends string = string> {
  description?: ReactNode;
  disabled?: boolean;
  icon?: string;
  label: ReactNode;
  value: T;
}

export interface SelectClassNames {
  content?: string;
  option?: string;
  root?: string;
  trigger?: string;
}

export interface SelectProps<T extends string = string> extends SelectVariants {
  ariaLabel?: string;
  className?: string;
  classNames?: SelectClassNames;
  name?: string;
  onChange?: (value: T, option: SelectOption<T>) => void;
  options: readonly SelectOption<T>[];
  /** `popover` floats the menu over the page; `inline` pushes content down. */
  placement?: "inline" | "popover";
  value?: T;
}

interface Anchor {
  edge: number;
  left: number;
  maxHeight: number;
  up: boolean;
  width: number;
}

const noSubscribe = () => () => {};
const readHost = () => document.body;
const noHost = () => null;
const canAnchor = () => CSS.supports("anchor-name", "--a");
const cannotAnchor = () => false;

const MENU_MAX = 256;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;

/**
 * A listbox select. Arrow keys move, Enter and Space choose, Escape closes;
 * the menu flips above the trigger when there is no room below.
 *
 *   <Select options={…} value={v} onChange={setV} size="sm" shape="pill" />
 */
export function Select<T extends string = string>({
  ariaLabel,
  className,
  classNames = {},
  name,
  onChange,
  options,
  placement = "popover",
  shape = "card",
  size = "md",
  value: valueProp,
}: SelectProps<T>) {
  const generatedId = useId();
  const listboxId = `select-listbox-${generatedId}`;
  const compact = size === "sm";

  const [selectedValue, setSelectedValue] = useControllableState<T | undefined>(
    {
      defaultValue: undefined,
      value: valueProp,
    },
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const host = useSyncExternalStore(noSubscribe, readHost, noHost);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const floating = placement === "popover" && host !== null && anchor !== null;
  const anchored = useSyncExternalStore(noSubscribe, canAnchor, cannotAnchor);
  const anchorName = `--select-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const place = useCallback(() => {
    const box = triggerRef.current?.getBoundingClientRect();
    if (!box) return;
    const wanted = Math.min(
      MENU_MAX,
      options.length * (compact ? 30 : 38) + 12,
    );
    const below = window.innerHeight - box.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const above = box.top - MENU_GAP - VIEWPORT_MARGIN;
    const up = wanted > below && above > below;
    setAnchor({
      edge: up ? window.innerHeight - box.top : box.bottom,
      left: box.left,
      maxHeight: Math.max(96, Math.min(MENU_MAX, up ? above : below)),
      up,
      width: box.width,
    });
  }, [compact, options.length]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  const enabledIndices = useMemo(
    () => options.flatMap((option, index) => (option.disabled ? [] : [index])),
    [options],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const open = useCallback(() => {
    place();
    setIsOpen(true);
    const selected = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );
    setHighlightedIndex(selected >= 0 ? selected : (enabledIndices[0] ?? -1));
  }, [enabledIndices, options, place, selectedValue]);

  useEscapeKey(() => {
    if (!isOpen) return;
    close();
    triggerRef.current?.focus();
  }, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handlePointerDownOutside);
    return () =>
      document.removeEventListener("mousedown", handlePointerDownOutside);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || placement !== "popover" || anchored) return;
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [anchored, isOpen, place, placement]);

  useEffect(() => {
    if (!isOpen || placement !== "popover") return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = menuRef.current;
      if (!box?.contains(event.target as Node)) return;
      const step = event.deltaMode === 1 ? 16 : 1;
      box.scrollTop += event.deltaY * step;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        event.preventDefault();
      }
    };
    const listener = { capture: true, passive: false } as const;
    window.addEventListener("wheel", onWheel, listener);
    window.addEventListener("touchmove", onTouchMove, listener);
    return () => {
      window.removeEventListener("wheel", onWheel, listener);
      window.removeEventListener("touchmove", onTouchMove, listener);
    };
  }, [isOpen, placement]);

  const choose = (option: SelectOption<T>) => {
    if (option.disabled) return;
    setSelectedValue(option.value);
    onChange?.(option.value, option);
    close();
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      if (enabledIndices.length === 0) return;
      const at = enabledIndices.indexOf(highlightedIndex);
      const last = enabledIndices.length - 1;
      const next =
        event.key === "ArrowDown"
          ? at < 0 || at >= last
            ? 0
            : at + 1
          : at <= 0
            ? last
            : at - 1;
      setHighlightedIndex(enabledIndices[next]);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      const candidate = options[highlightedIndex];
      if (candidate && !candidate.disabled) choose(candidate);
      else close();
    }
  };

  const rise = floating && anchor.up ? -1 : 1;

  const menu = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            scale: 0.97,
            transition: { duration: step(-2), ease: POINTS.glide },
            y: rise * -6,
          }}
          id={listboxId}
          initial={{ opacity: 0, scale: 0.96, y: rise * -8 }}
          key="listbox"
          ref={menuRef}
          role="listbox"
          data-cinematic={floating ? "" : undefined}
          style={{
            zIndex: Z_INDEX.SELECT,
            ...(floating && anchored
              ? ({
                  left: "anchor(left)",
                  marginTop: MENU_GAP,
                  position: "fixed",
                  positionAnchor: anchorName,
                  positionTryFallbacks: "flip-block",
                  top: "anchor(bottom)",
                  width: "anchor-size(width)",
                } as CSSProperties)
              : floating
                ? {
                    left: anchor.left,
                    marginBottom: anchor.up ? MENU_GAP : 0,
                    marginTop: anchor.up ? 0 : MENU_GAP,
                    maxHeight: anchor.maxHeight,
                    position: "fixed",
                    width: anchor.width,
                    ...(anchor.up
                      ? { bottom: anchor.edge, top: "auto" }
                      : { top: anchor.edge }),
                  }
                : null),
            transformOrigin: floating && anchor.up ? "bottom" : "top",
          }}
          transition={{ duration: step(0), ease: POINTS.expo }}
          className={cn(
            selectMenuVariants({ shape, size }),
            classNames.content,
          )}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-center type-meta text-ink-muted">
              No options available
            </div>
          ) : (
            <LayoutGroup id={`select-options-${generatedId}`}>
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                const isHighlighted =
                  index === highlightedIndex && !option.disabled;
                return (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -8 }}
                    key={option.value}
                    role="option"
                    transition={{
                      delay: step(-5) * (1 + Math.min(index, 5)),
                      duration: step(-1),
                      ease: POINTS.expo,
                    }}
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-highlighted={isHighlighted || undefined}
                    onMouseEnter={() => {
                      if (!option.disabled) setHighlightedIndex(index);
                    }}
                    onClick={() => choose(option)}
                    className={cn(
                      selectOptionVariants({ shape, size }),
                      classNames.option,
                    )}
                  >
                    {isHighlighted ? (
                      <SlidingHighlight
                        className="rounded-[inherit] bg-fill-hover"
                        layoutId="select-option-highlight"
                      />
                    ) : null}
                    <span className="relative z-10 flex min-w-0 items-center gap-2.5">
                      {option.icon ? (
                        <Icon icon={option.icon} size={16} className={ICON} />
                      ) : null}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.description ? (
                          <span className="truncate type-meta text-ink-muted">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {isSelected ? (
                      <Icon
                        icon="solar:check-read-linear"
                        size={16}
                        className="relative z-10 shrink-0 text-ink"
                      />
                    ) : null}
                  </motion.div>
                );
              })}
            </LayoutGroup>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative inline-flex w-full flex-col gap-1.5",
        classNames.root,
        className,
      )}
    >
      {name ? (
        <input type="hidden" name={name} value={selectedValue ?? ""} />
      ) : null}

      <button
        ref={triggerRef}
        style={
          anchored && placement === "popover"
            ? ({ anchorName } as CSSProperties)
            : undefined
        }
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          selectTriggerVariants({ shape, size }),
          classNames.trigger,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.icon ? (
            <Icon icon={selectedOption.icon} size={16} className={ICON} />
          ) : null}
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="truncate text-ink-muted">Select an option...</span>
          )}
        </span>
        <Icon
          icon="solar:alt-arrow-down-linear"
          size={16}
          className="cine-turn shrink-0 text-ink-muted group-aria-expanded:rotate-180 group-aria-expanded:text-ink"
        />
      </button>

      {floating ? createPortal(menu, host) : menu}
    </div>
  );
}
