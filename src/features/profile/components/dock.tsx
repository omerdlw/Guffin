"use client";

import { type JSX, useMemo, useState } from "react";
import {
  useDockActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { SegmentedControl } from "@/design/components/segmented-control";
import { useDockCommands } from "@/design/dock/commands";
import { useSurfacePreload } from "@/design/surface/lazy";
import { DockAction } from "@/design/surface/surface";
import {
  DEFAULT_ACCOUNT_ICON,
  type PublicAccount,
  accountMeta,
} from "@/features/account/model";
import { type Inbox, useAccount, useInbox } from "@/features/account/provider";
import { accountSettingsSurface } from "@/features/account/surfaces";
import { followsSurface } from "@/features/social/surfaces";
import { accountHref } from "@/shared/site";
import { useProfileFollow } from "../use-profile-follow";

type ProfileTab = "films" | "inbox";

const INBOX_ICON = "solar:inbox-archive-bold";

const SETTINGS_ORDER = 10;

const FILMS_ITEM = {
  icon: "solar:clapperboard-play-bold",
  key: "films" as ProfileTab,
  label: "Films",
};

function ProfileSwitch({
  inbox,
  inboxOpen,
}: {
  inbox: Inbox;
  inboxOpen: boolean;
}): JSX.Element {
  const choose = (next: ProfileTab) => {
    if (next === "inbox") inbox.open();
  };

  return (
    <DockAction>
      <SegmentedControl
        ariaLabel="Films or inbox"
        className="h-control-md"
        items={[
          FILMS_ITEM,
          {
            count: inbox.count,
            icon: INBOX_ICON,
            key: "inbox",
            label: "Inbox",
          },
        ]}
        onChange={choose}
        value={inboxOpen ? "inbox" : "films"}
        width="fill"
      />
    </DockAction>
  );
}

function useOwnerSettings(isOwner: boolean): void {
  const { openSurface } = useDockActions();
  useSurfacePreload(accountSettingsSurface);
  const commands = useMemo(
    () => [
      {
        icon: "solar:settings-bold",
        key: "account.settings",
        onClick: () =>
          void accountSettingsSurface.open(openSurface, {
            section: "overview",
          }),
        order: SETTINGS_ORDER,
        tooltip: "Account settings",
        visible: isOwner,
      },
    ],
    [isOwner, openSurface],
  );
  useDockCommands(commands);
}

export function ProfileDock({
  account: served,
}: {
  account: PublicAccount;
}): null {
  const { account: own } = useAccount();
  const isOwner = own?.id === served.id;
  const account = isOwner ? { ...served, ...own } : served;
  const ownInbox = useInbox();
  const inboxOpen = useDockSelector((state) =>
    followsSurface.shows(state.activeSurfaceEntry?.component),
  );
  const [kept, setKept] = useState<Inbox | null>(null);
  if (ownInbox && ownInbox !== kept) setKept(ownInbox);
  const inbox = useMemo(
    () =>
      !isOwner
        ? null
        : (ownInbox ?? (inboxOpen && kept ? { ...kept, count: 0 } : null)),
    [inboxOpen, isOwner, kept, ownInbox],
  );
  useProfileFollow({ account: served, enabled: !isOwner });
  useOwnerSettings(isOwner);
  const { avatarUrl, displayName, username } = account;
  const description = accountMeta(account);

  const config = useMemo(
    () => ({
      action: inbox ? (
        <ProfileSwitch inbox={inbox} inboxOpen={inboxOpen} />
      ) : null,
      description,
      icon: avatarUrl || DEFAULT_ACCOUNT_ICON,
      path: accountHref(username),
      title: displayName || username,
    }),
    [avatarUrl, description, displayName, inbox, inboxOpen, username],
  );

  useDockRegistration(config, {
    priority: 260,
    source: REGISTRY_SOURCES.DYNAMIC,
  });
  return null;
}
