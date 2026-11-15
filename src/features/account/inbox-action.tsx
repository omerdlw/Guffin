"use client";

import { useDockActionClass } from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
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
          <ActionIcon icon="solar:inbox-bold" />
          <ActionLabel className="">{`Inbox ${count}`}</ActionLabel>
        </Button>
      </div>
    </DockAction>
  );
}
