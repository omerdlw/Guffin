"use client";

import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { DockAction } from "@/design/components/surface";
import { ACTION_TONE } from "@/design/foundations/tones";

export function AccountInboxAction({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <DockAction>
      <div className="flex items-center gap-2">
        <Button
          aria-label={`Inbox with ${count} pending requests`}
          className={actionClass({
            className: "disabled:cursor-not-allowed disabled:opacity-50",
            variant: ACTION_TONE,
          })}
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <Icon icon="solar:inbox-bold" size={16} />
          <span>Inbox {count}</span>
        </Button>
      </div>
    </DockAction>
  );
}
