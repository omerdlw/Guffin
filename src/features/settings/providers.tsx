"use client";

import { useMemo, useState } from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import type { UserIdentity } from "@supabase/supabase-js";
import { linkIdentity, unlinkIdentity } from "@/features/auth/client";
import { OAUTH_PROVIDERS } from "@/features/auth/constants";
import { useAuth } from "@/features/auth/provider";
import type { OAuthProvider } from "@/features/auth/types";
import { getAuthCallbackUrl, getAuthErrorMessage } from "@/features/auth/utils";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { HighlightGroup, useHighlight } from "@/ui/form";
import { Icon } from "@/ui/media";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TITLE,
  surfaceRow,
} from "@/ui/tokens";
import { PROVIDER_LABELS } from "./constants";
import { Mark } from "./shared";
import { providerOf, rowAction } from "./utils";

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
    <div className={cn(SURFACE_TILE, "relative isolate")} {...highlight.props}>
      {highlight.node}
      <Mark icon={PROVIDER_LABELS[provider].icon} size={18} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{PROVIDER_LABELS[provider].label}</span>
        <span className={SURFACE_META}>Connected</span>
      </span>
      <Button
        className={rowAction()}
        disabled={disabled}
        loading={busy}
        onClick={onUnlink}
      >
        Disconnect
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
      className={surfaceRow(false)}
      disabled={disabled}
      loading={busy}
      onClick={onLink}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={PROVIDER_LABELS[provider].icon} size={18} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>
          Connect {PROVIDER_LABELS[provider].label}
        </span>
      </span>
      <Icon
        className="center shrink-0 text-ink-muted group-hover:text-ink group-focus-visible:text-ink group-has-focus-visible:text-ink"
        icon="solar:link-linear"
        size={16}
      />
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
