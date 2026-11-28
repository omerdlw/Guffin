"use client";

import { useMemo, useState } from "react";
import { useToast } from "@omerdlw/base-framework/notification";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/surface/classes";
import { cn } from "@/design/ui";
import {
  type LinkedIdentity,
  linkIdentity,
  unlinkIdentity,
} from "@/features/auth/api";
import { getAuthErrorMessage } from "@/features/auth/errors";
import {
  getAuthCallbackUrl,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "@/features/auth/model";
import { useAuth } from "@/features/auth/provider";
import { Mark } from "./panel";

const PROVIDER_LABELS: Record<OAuthProvider, { icon: string; label: string }> =
  {
    github: { icon: "simple-icons:github", label: "GitHub" },
    google: { icon: "simple-icons:google", label: "Google" },
    x: { icon: "simple-icons:x", label: "X" },
  };

function providerOf(identity: LinkedIdentity): OAuthProvider | null {
  const name = identity.provider;
  return OAUTH_PROVIDERS.includes(name as OAuthProvider)
    ? (name as OAuthProvider)
    : null;
}

// One row per provider, connected or not: its mark, its name and state,
// and the one thing you can do about it.
function ProviderRow({
  busy,
  connected,
  disabled,
  onAction,
  provider,
}: {
  busy: boolean;
  connected: boolean;
  disabled: boolean;
  onAction: () => void;
  provider: OAuthProvider;
}) {
  const highlight = useHighlight(provider);
  const { icon, label } = PROVIDER_LABELS[provider];
  return (
    <div
      className={cn(tileVariants(), "relative isolate pr-2")}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={icon} size={18} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{label}</span>
        <span
          className={cn(
            SURFACE_META,
            "flex items-center gap-1.5",
            connected && "text-ink-body",
          )}
        >
          {connected ? (
            <span className="size-1.5 shrink-0 rounded-full bg-watched" />
          ) : null}
          {connected ? "Connected" : "Not connected"}
        </span>
      </span>
      <Button
        aria-label={`${connected ? "Disconnect" : "Connect"} ${label}`}
        className="shrink-0"
        disabled={disabled}
        intent={connected ? "ghost" : "neutral"}
        loading={busy}
        onClick={onAction}
        shape="pill"
        size="sm"
      >
        {connected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}

export function ProvidersPanel({
  identities,
  reload,
}: {
  identities: LinkedIdentity[];
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
    const linked = new Map<OAuthProvider, LinkedIdentity>();
    for (const identity of active) {
      const provider = providerOf(identity);
      if (provider) linked.set(provider, identity);
    }
    return linked;
  }, [active]);

  async function unlink(provider: OAuthProvider, identity: LinkedIdentity) {
    if (unlinking) return;
    const { label } = PROVIDER_LABELS[provider];
    setUnlinking(provider);
    try {
      await unlinkIdentity(identity);
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
    if (linking) return;
    setLinking(provider);
    try {
      await linkIdentity(provider, getAuthCallbackUrl("/account"));
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
      {OAUTH_PROVIDERS.map((provider) => {
        const identity = connected.get(provider);
        return (
          <ProviderRow
            busy={(identity ? unlinking : linking) === provider}
            connected={Boolean(identity)}
            disabled={Boolean(identity ? unlinking : linking)}
            key={provider}
            onAction={() =>
              identity ? unlink(provider, identity) : link(provider)
            }
            provider={provider}
          />
        );
      })}
    </HighlightGroup>
  );
}
