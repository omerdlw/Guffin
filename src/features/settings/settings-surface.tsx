"use client";

import { useDockActions } from "@omerdlw/base-framework/dock";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { SurfacePart, SurfaceStage } from "@/design/components/surface";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
} from "@/design/components/surface-classes";
import { defineSurface } from "@/design/surface-definition";
import { MediaForm, ProfileForm } from "./identity";
import { Mark, useSecurity } from "./panel";
import { PasskeysPanel } from "./passkeys";
import { ProvidersPanel } from "./providers";
import { DeletePanel, EmailForm } from "./security";
import { SessionsPanel } from "./sessions";

type SettingsSection = keyof typeof SETTINGS_SECTIONS;

type SettingsKey = SettingsSection | "overview";

const SETTINGS_SECTIONS = {
  "avatar-background": {
    description: "Photo and page background",
    icon: "solar:gallery-bold",
    title: "Avatar & Background",
  },
  account: {
    description: "Name, username, bio and privacy",
    icon: "solar:user-circle-bold",
    title: "Account info",
  },
  email: {
    description: "The address you sign in with",
    icon: "solar:letter-bold",
    title: "Email sign-in",
  },
  providers: {
    description: "Google, GitHub and X",
    icon: "solar:link-bold",
    title: "Connected providers",
  },
  sessions: {
    description: "Devices signed in to your account",
    icon: "solar:devices-bold",
    title: "Active sessions",
  },
  passkeys: {
    description: "Sign in with your device",
    icon: "solar:key-bold",
    title: "Passkeys",
  },
  delete: {
    description: "Remove your account for good",
    icon: "solar:trash-bin-trash-bold",
    title: "Delete account",
  },
} as const;

const SETTINGS_OVERVIEW = {
  icon: "solar:settings-bold",
  title: "Account settings",
};

const SECURITY_SECTIONS: readonly SettingsKey[] = [
  "passkeys",
  "providers",
  "sessions",
];

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
      className={rowVariants()}
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
    void accountSettingsSurface.open(openSurface, { section });
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
    case "avatar-background":
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

function sectionMeta(section: SettingsKey) {
  return section === "overview"
    ? SETTINGS_OVERVIEW
    : SETTINGS_SECTIONS[section];
}

export const accountSettingsSurface = defineSurface<{ section: SettingsKey }>({
  component: AccountSettingsSurface,
  icon: ({ section }) => sectionMeta(section).icon,
  title: ({ section }) => sectionMeta(section).title,
});
