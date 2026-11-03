"use client";

import {
  useDockActions,
  type SurfaceEntry,
} from "@omerdlw/base-framework/modules/dock";
import {
  Button,
  HighlightGroup,
  Icon,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  SurfacePart,
  SurfaceStage,
  surfaceRow,
  useHighlight,
} from "@/ui";
import { DeletePanel } from "./components/delete-panel";
import { EmailForm } from "./components/email-form";
import { Mark } from "./components/form";
import { MediaForm } from "./components/media-form";
import { PasskeysPanel } from "./components/passkeys-panel";
import { ProfileForm } from "./components/profile-form";
import { ProvidersPanel } from "./components/providers-panel";
import { SessionsPanel } from "./components/sessions-panel";
import { useSecurity } from "./hooks";

const SECTIONS = {
  "avatar-banner": {
    description: "Photo, banner and page background",
    icon: "solar:gallery-bold",
    title: "Avatar & Banners",
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

type Section = keyof typeof SECTIONS;
type SettingsKey = Section | "overview";

const OVERVIEW = { icon: "solar:settings-bold", title: "Account settings" };
const SECURITY_SECTIONS: readonly SettingsKey[] = [
  "passkeys",
  "providers",
  "sessions",
];

function OverviewRow({
  onOpen,
  section,
}: {
  onOpen: (section: Section) => void;
  section: Section;
}) {
  const { description, icon, title } = SECTIONS[section];
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
  const open = (section: Section) =>
    void openSurface(createAccountSettingsSurfaceEntry(section));
  return (
    <HighlightGroup>
      <div className={SURFACE_STACK}>
        {(Object.keys(SECTIONS) as Section[]).map((section, index) => (
          <SurfacePart index={index} key={section} name="item">
            <OverviewRow onOpen={open} section={section} />
          </SurfacePart>
        ))}
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
  const { icon, title } = section === "overview" ? OVERVIEW : SECTIONS[section];
  return {
    component: AccountSettingsSurface,
    icon,
    props: { section },
    title,
    width: section === "avatar-banner" ? 580 : undefined,
  };
}
