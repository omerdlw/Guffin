"use client";

import { useMemo, type JSX } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/modules/dock";
import { Button, DockAction, Icon } from "@/ui";

interface DockAction {
  icon: string;
  label: string;
  onClick?: () => void;
}

export function SpotlightDock({
  action,
  control,
  description,
  href,
  icon,
  path,
  title,
}: {
  action?: DockAction;
  control?: JSX.Element;
  description: string;
  href?: string;
  icon: string;
  path: string;
  title: string;
}): null {
  const button = useMemo(
    () =>
      control ??
      (action ? (
        <Open
          href={href}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          title={title}
        />
      ) : null),
    [action?.icon, action?.label, action?.onClick, control, href, title],
  );
  const config = useMemo(
    () => ({ action: button, description, icon, path, title }),
    [button, description, icon, path, title],
  );
  useDockRegistration(config);
  return null;
}

function Open({
  href,
  icon,
  label,
  onClick,
  title,
}: DockAction & { href?: string; title: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();
  return (
    <DockAction>
      <Button
        aria-label={href ? `${label}: ${title}` : label}
        className={actionClass({ className: "w-full" })}
        onClick={() => {
          if (onClick) onClick();
          else if (href) void navigate(href);
        }}
        type="button"
      >
        <Icon icon={icon} size={16} />
        <span className="truncate">{label}</span>
      </Button>
    </DockAction>
  );
}
