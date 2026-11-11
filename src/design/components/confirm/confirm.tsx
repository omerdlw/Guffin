"use client";

import { cn } from "../../foundations/cn";
import { Button } from "../button";
import { Icon } from "../icon";

export interface ConfirmOptions {
  action?: string;
  description?: string;
  icon?: string;
  title: string;
  tone?: "danger" | "neutral";
}

export function ConfirmHud({
  action = "Delete",
  description,
  icon = "solar:trash-bin-trash-bold",
  onAnswer,
  title,
  tone = "danger",
}: ConfirmOptions & { onAnswer: (yes: boolean) => void }) {
  return (
    <div
      aria-describedby={description ? "confirm-hud-description" : undefined}
      aria-labelledby="confirm-hud-title"
      className="flex w-full items-center gap-3 p-1.5"
      onClick={(event) => event.stopPropagation()}
      role="alertdialog"
    >
      <span
        className={cn(
          "center size-9 shrink-0 rounded-inset",
          tone === "danger"
            ? "bg-danger/15 text-danger"
            : "bg-fill text-ink-body",
        )}
      >
        <Icon className="ui-glyph center" icon={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span
          className="truncate type-body font-semibold text-ink"
          id="confirm-hud-title"
        >
          {title}
        </span>
        {description ? (
          <span
            className="truncate type-meta text-ink-muted"
            id="confirm-hud-description"
          >
            {description}
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 gap-1.5">
        <Button
          intent="neutral"
          shape="thumb"
          size="sm"
          onClick={() => onAnswer(false)}
        >
          Cancel
        </Button>
        <Button
          autoFocus
          intent={tone === "danger" ? "danger" : "primary"}
          shape="thumb"
          size="sm"
          onClick={() => onAnswer(true)}
        >
          {action}
        </Button>
      </div>
    </div>
  );
}
