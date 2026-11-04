"use client";

import {
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { Button } from "@/ui/button";
import { HighlightGroup, useHighlight } from "@/ui/form";
import { Icon } from "@/ui/media";
import { SurfacePart, SurfaceStage } from "@/ui/surface";
import {
  SECURITY_SECTIONS,
  SETTINGS_OVERVIEW,
  SETTINGS_SECTIONS,
} from "./constants";
import { MediaForm, ProfileForm } from "./identity";
import {
  DeletePanel,
  EmailForm,
  PasskeysPanel,
  ProvidersPanel,
  SessionsPanel,
} from "./security";
import { Mark, useSecurity } from "./shared";
import type { SettingsKey, SettingsSection } from "./types";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  surfaceRow,
} from "@/ui/tokens";

function OverviewRow({
  onOpen,
  section,
}: {
  onOpen: (section: SettingsSection) => void;
  section: SettingsSection;
}) {
  const { description, icon, title } = SETTINGS_SECTIONS[section];
  const highlight = useHighlight(section);
  return (
    <Button
      className={surfaceRow(false)}
      onClick={() => onOpen(section)}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={icon} tone={section === "delete" ? "danger" : "plain"} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{title}</span>
        <span className={SURFACE_META}>{description}</span>
      </span>
      <Icon
        className="center shrink-0 text-ink-muted group-hover:translate-x-0.5 group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink"
        icon="solar:alt-arrow-right-linear"
        size={16}
      />
    </Button>
  );
}

function Overview() {
  const { openSurface } = useDockActions();
  const open = (section: SettingsSection) =>
    void openSurface(createAccountSettingsSurfaceEntry(section));
  return (
    <HighlightGroup>
      <div className={SURFACE_STACK}>
        {(Object.keys(SETTINGS_SECTIONS) as SettingsSection[]).map(
          (section, index) => (
            <SurfacePart index={index} key={section} name="item">
              <OverviewRow onOpen={open} section={section} />
            </SurfacePart>
          ),
        )}
      </div>
    </HighlightGroup>
  );
}

function AccountSettingsSurface({
  close,
  section,
}: {
  close?: () => void;
  section: SettingsKey;
}) {
  const security = useSecurity(SECURITY_SECTIONS.includes(section));
  const done = () => close?.();

  return (
    <SurfaceStage>
      <Panel done={done} section={section} security={security} />
    </SurfaceStage>
  );
}

function Panel({
  done,
  section,
  security,
}: {
  done: () => void;
  section: SettingsKey;
  security: ReturnType<typeof useSecurity>;
}) {
  switch (section) {
    case "overview":
      return <Overview />;
    case "account":
      return <ProfileForm onSaved={done} />;
    case "avatar-banner":
      return <MediaForm onSaved={done} />;
    case "email":
      return <EmailForm />;
    case "providers":
      return (
        <ProvidersPanel
          identities={security.identities}
          reload={security.reload}
        />
      );
    case "sessions":
      return (
        <SessionsPanel
          loading={security.loading}
          reload={security.reload}
          sessions={security.sessions}
        />
      );
    case "passkeys":
      return (
        <PasskeysPanel
          loading={security.loading}
          passkeys={security.passkeys}
          reload={security.reload}
        />
      );
    case "delete":
      return <DeletePanel />;
  }
}

export function createAccountSettingsSurfaceEntry(
  section: SettingsKey = "overview",
): SurfaceEntry {
  const { icon, title } =
    section === "overview" ? SETTINGS_OVERVIEW : SETTINGS_SECTIONS[section];
  return {
    component: AccountSettingsSurface,
    icon,
    props: { section },
    title,
    width: section === "avatar-banner" ? 580 : undefined,
  };
}
