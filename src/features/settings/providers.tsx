"use client";

import { useMemo, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import type { UserIdentity } from "@supabase/supabase-js";
import { Icon } from "@/design/components/icon";
import {
  rowVariants,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { cn } from "@/design/ui";
import { linkIdentity, unlinkIdentity } from "@/features/auth/client";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { useAuth } from "@/features/auth/provider";
import {
  getAuthCallbackUrl,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "@/features/auth/session";

const PROVIDER_LABELS: Record<OAuthProvider, { icon: string; label: string }> =
  {
    github: { icon: "mdi:github", label: "GitHub" },
    google: { icon: "flat-color-icons:google", label: "Google" },
    x: { icon: "simple-icons:x", label: "X" },
  };

function providerOf(identity: UserIdentity): OAuthProvider | null {
  const name = identity.provider.trim().toLowerCase();
  if (name === "google" || name === "google.com") return "google";
  if (name === "github" || name === "github.com") return "github";
  if (["x", "x.com", "twitter", "twitter.com"].includes(name)) return "x";
  return null;
}

function ProviderGlyph({ provider }: { provider: OAuthProvider }) {
  return (
    <span className="center size-8 shrink-0 text-ink-body ui-fade group-hover/connect:text-ink group-focus-visible/connect:text-ink">
      <Icon
        className="ui-glyph center"
        icon={PROVIDER_LABELS[provider].icon}
        size={28}
      />
    </span>
  );
}

function ConnectedRow({
  busy,
  disabled,
  onUnlink,
  provider,
}: {
  busy: boolean;
  disabled: boolean;
  onUnlink: () => void;
  provider: OAuthProvider;
}) {
  const highlight = useHighlight(provider);
  return (
    <div
      className={cn(tileVariants(), "group/connect relative isolate")}
      {...highlight.props}
    >
      {highlight.node}
      <ProviderGlyph provider={provider} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{PROVIDER_LABELS[provider].label}</span>
        <span className={SURFACE_META}>Connected</span>
      </span>
      <Button
        aria-label={`Disconnect ${PROVIDER_LABELS[provider].label}`}
        className="group/chip"
        disabled={disabled}
        icon
        intent="ghost"
        loading={busy}
        onClick={onUnlink}
        shape="pill"
        size="chrome"
        title="Disconnect"
      >
        <Icon
          className="center absolute ui-fade group-hover/chip:opacity-0 group-focus-visible/chip:opacity-0"
          icon="solar:link-bold"
          size={16}
        />
        <Icon
          className="center absolute opacity-0 ui-fade group-hover/chip:opacity-100 group-focus-visible/chip:opacity-100"
          icon="solar:link-broken-linear"
          size={16}
        />
      </Button>
    </div>
  );
}

function ConnectRow({
  busy,
  disabled,
  onLink,
  provider,
}: {
  busy: boolean;
  disabled: boolean;
  onLink: () => void;
  provider: OAuthProvider;
}) {
  const highlight = useHighlight(provider);
  return (
    <Button
      className={rowVariants({ className: "group/connect pr-3" })}
      disabled={disabled}
      loading={busy}
      onClick={onLink}
      {...highlight.props}
    >
      {highlight.node}
      <ProviderGlyph provider={provider} />
      <span className={SURFACE_TEXT}>
        <span
          className={cn(
            SURFACE_TITLE,
            "text-ink-body ui-fade group-hover/connect:text-ink group-focus-visible/connect:text-ink",
          )}
        >
          Connect {PROVIDER_LABELS[provider].label}
        </span>
      </span>
      <span className="center size-9 shrink-0 rounded-full text-ink-muted ui-fade hover:bg-fill-hover hover:text-ink">
        <Icon className="center" icon="solar:link-linear" size={16} />
      </span>
    </Button>
  );
}

export function ProvidersPanel({
  identities,
  reload,
}: {
  identities: UserIdentity[];
  reload: () => Promise<void>;
}) {
  const auth = useAuth();
  const toast = useToast();
  const [linking, setLinking] = useState<OAuthProvider | null>(null);
  const [unlinking, setUnlinking] = useState<OAuthProvider | null>(null);
  const [unlinkedIds, setUnlinkedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const active = useMemo(
    () => identities.filter((identity) => !unlinkedIds.has(identity.id)),
    [identities, unlinkedIds],
  );

  const connected = useMemo(() => {
    const linked = new Map<OAuthProvider, UserIdentity>();
    for (const identity of active) {
      const provider = providerOf(identity);
      if (provider) linked.set(provider, identity);
    }
    return linked;
  }, [active]);

  async function unlink(provider: OAuthProvider, identity: UserIdentity) {
    if (unlinking || !auth.client) return;
    if (active.length < 2) {
      toast("Keep at least one sign-in method connected to this account");
      return;
    }
    const { label } = PROVIDER_LABELS[provider];
    setUnlinking(provider);
    try {
      await unlinkIdentity(auth.client, identity);
      setUnlinkedIds((ids) => new Set([...ids, identity.id]));
      toast(`${label} disconnected`);
      await reload();
      await auth.refresh();
    } catch (error) {
      toast(getAuthErrorMessage(error, `Couldn't disconnect ${label}`));
    } finally {
      setUnlinking(null);
    }
  }

  async function link(provider: OAuthProvider) {
    if (linking || !auth.client) return;
    setLinking(provider);
    try {
      await linkIdentity(auth.client, provider, getAuthCallbackUrl("/account"));
    } catch (error) {
      setLinking(null);
      toast(
        getAuthErrorMessage(
          error,
          `Couldn't connect ${PROVIDER_LABELS[provider].label}`,
        ),
      );
    }
  }

  return (
    <HighlightGroup className={SURFACE_STACK}>
      {[...connected].map(([provider, identity]) => (
        <ConnectedRow
          busy={unlinking === provider}
          disabled={Boolean(unlinking)}
          key={provider}
          onUnlink={() => unlink(provider, identity)}
          provider={provider}
        />
      ))}
      {OAUTH_PROVIDERS.filter((provider) => !connected.has(provider)).map(
        (provider) => (
          <ConnectRow
            busy={linking === provider}
            disabled={Boolean(linking)}
            key={provider}
            onLink={() => link(provider)}
            provider={provider}
          />
        ),
      )}
    </HighlightGroup>
  );
}
