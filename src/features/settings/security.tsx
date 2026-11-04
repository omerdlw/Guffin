"use client";

import { useMemo, useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import type { PasskeyListItem, UserIdentity } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useAccount } from "@/features/account/provider";
import {
  deletePasskey,
  linkIdentity,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  unlinkIdentity,
} from "@/features/auth/client";
import { OAUTH_PROVIDERS } from "@/features/auth/constants";
import { useAuth } from "@/features/auth/provider";
import type { OAuthProvider } from "@/features/auth/types";
import { getAuthCallbackUrl, getAuthErrorMessage } from "@/features/auth/utils";
import { createVerificationSurfaceEntry } from "@/features/auth/verification";
import { requestJson } from "@/lib/http";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { HighlightGroup, Input, useHighlight } from "@/ui/form";
import { Icon } from "@/ui/media";
import {
  DELETE_CONFIRMATION,
  INPUT_CLASS,
  PROVIDER_LABELS,
  SUBMIT_CLASS,
} from "./constants";
import { Mark, useSecurityTask } from "./shared";
import type { AuthSession } from "./types";
import {
  describeDevice,
  describeSession,
  providerOf,
  rowAction,
} from "./utils";
import {
  SURFACE_DANGER,
  SURFACE_META,
  SURFACE_PANEL,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TITLE,
  surfaceButton,
  surfaceRow,
} from "@/ui/tokens";

export function EmailForm() {
  const auth = useAuth();
  const { account } = useAccount();
  const toast = useToast();
  const currentEmail = account?.email?.trim() ?? "";
  const [email, setEmail] = useState(currentEmail);
  const [pending, setPending] = useState(false);

  async function updateEmail() {
    if (!auth.client) return;
    setPending(true);
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      toast("Check your inbox to confirm the new email");
    } catch (error) {
      toast(getAuthErrorMessage(error, "Couldn't update your email"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={SURFACE_STACK}>
      <Input
        aria-label="New email"
        className={INPUT_CLASS}
        disabled={pending}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="New email"
        type="email"
        value={email}
      />
      <Button
        className={SUBMIT_CLASS}
        disabled={
          pending ||
          !auth.client ||
          !email.trim() ||
          email.trim() === currentEmail
        }
        loading={pending}
        onClick={updateEmail}
      >
        Verify and update email
      </Button>
    </div>
  );
}

function PasskeysSkeleton() {
  return (
    <div className={SURFACE_STACK}>
      {[0, 1].map((index) => (
        <div className={cn(SURFACE_TILE, "h-[52px] pr-1.5")} key={index}>
          <div className="size-10 shrink-0 rounded-inset bg-fill-hover" />
          <div className="h-3.5 w-28 flex-1 rounded-full bg-fill-hover" />
          <div className="size-10 shrink-0 rounded-inset bg-fill-hover" />
        </div>
      ))}
    </div>
  );
}

function PasskeyRow({
  disabled,
  id,
  name,
  onEdit,
  onRemove,
}: {
  disabled: boolean;
  id: string;
  name: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const highlight = useHighlight(id);
  return (
    <div className={cn(SURFACE_TILE, "relative isolate")} {...highlight.props}>
      {highlight.node}
      <Mark icon="solar:key-bold" />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{name}</span>
      </span>
      <span className="flex shrink-0 items-center">
        <Button
          aria-label={`Rename ${name}`}
          className={rowAction(true)}
          disabled={disabled}
          onClick={onEdit}
        >
          <Icon icon="solar:pen-bold" size={16} />
        </Button>
        <Button
          aria-label={`Remove ${name}`}
          className={rowAction(true)}
          disabled={disabled}
          onClick={onRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      </span>
    </div>
  );
}

export function PasskeysPanel({
  loading,
  passkeys,
  reload,
}: {
  loading: boolean;
  passkeys: PasskeyListItem[];
  reload: () => Promise<void>;
}) {
  const { client } = useAuth();
  const run = useSecurityTask(reload);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (loading && passkeys.length === 0) return <PasskeysSkeleton />;

  return (
    <HighlightGroup className={SURFACE_STACK}>
      {passkeys.length === 0 ? (
        <div
          className={cn(
            SURFACE_PANEL,
            "flex flex-col items-center gap-2 p-6 text-center",
          )}
        >
          <Icon className="text-ink-muted" icon="solar:key-bold" size={22} />
          <span className="type-meta font-medium text-ink-muted">
            No passkeys registered
          </span>
        </div>
      ) : (
        passkeys.map((passkey) => {
          const name = passkey.friendly_name || "Passkey";
          if (editing?.id === passkey.id) {
            return (
              <div className={SURFACE_STACK} key={passkey.id}>
                <Input
                  aria-label="Passkey name"
                  autoFocus
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setEditing({ id: passkey.id, name: event.target.value })
                  }
                  placeholder="Passkey name"
                  value={editing.name}
                />
                <div className="flex w-full gap-2.5">
                  <Button
                    className={cn(surfaceButton(false), "flex-1")}
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={cn(SUBMIT_CLASS, "flex-1")}
                    disabled={pending || !editing.name.trim() || !client}
                    loading={pending}
                    onClick={() =>
                      client &&
                      run(
                        async () => {
                          await renamePasskey(
                            client,
                            passkey.id,
                            editing.name.trim(),
                          );
                          setEditing(null);
                        },
                        setPending,
                        "Passkey renamed",
                        "Couldn't rename this passkey",
                      )
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <PasskeyRow
              disabled={pending || !client}
              key={passkey.id}
              name={name}
              onEdit={() => setEditing({ id: passkey.id, name })}
              onRemove={() =>
                client &&
                run(
                  () => deletePasskey(client, passkey.id),
                  setPending,
                  "Passkey removed",
                  "Couldn't remove this passkey",
                )
              }
              id={passkey.id}
            />
          );
        })
      )}
      <Button
        className={SUBMIT_CLASS}
        disabled={pending || !client || editing !== null}
        loading={pending && editing === null}
        onClick={() =>
          client &&
          run(
            () => registerPasskey(client),
            setPending,
            "Passkey added",
            "Couldn't add a passkey",
          )
        }
      >
        <Icon icon="solar:add-circle-bold" size={16} />
        Add passkey
      </Button>
    </HighlightGroup>
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

function SessionsSkeleton() {
  return (
    <div className={SURFACE_STACK}>
      {[0, 1].map((index) => (
        <div className={cn(SURFACE_TILE, "h-[52px] pr-1.5")} key={index}>
          <div className="size-10 shrink-0 rounded-inset bg-fill-hover" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-28 rounded-full bg-fill-hover" />
            <div className="h-2.5 w-40 rounded-full bg-fill-hover" />
          </div>
          <div className="h-10 w-20 shrink-0 rounded-inset bg-fill-hover" />
        </div>
      ))}
    </div>
  );
}

function SessionRow({
  busy,
  disabled,
  onRevoke,
  session,
}: {
  busy: boolean;
  disabled: boolean;
  onRevoke: () => void;
  session: AuthSession;
}) {
  const highlight = useHighlight(session.session_id);
  const device = describeDevice(session.user_agent);
  return (
    <div
      className={cn(SURFACE_TILE, "relative isolate")}
      title={session.user_agent ?? undefined}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon={device.icon} />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{device.title}</span>
        <span className={SURFACE_META}>{describeSession(session)}</span>
      </span>
      {session.is_current ? (
        <span className="flex shrink-0 items-center gap-2 px-3 type-meta font-medium text-ink-muted">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-ink-body"
          />
          This device
        </span>
      ) : (
        <Button
          className={rowAction()}
          disabled={disabled}
          loading={busy}
          onClick={onRevoke}
        >
          Sign out
        </Button>
      )}
    </div>
  );
}

export function SessionsPanel({
  loading,
  reload,
  sessions,
}: {
  loading: boolean;
  reload: () => Promise<void>;
  sessions: AuthSession[];
}) {
  const run = useSecurityTask(reload);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  if (loading && sessions.length === 0) return <SessionsSkeleton />;

  const revoke = (sessionId: string) =>
    run(
      () =>
        requestJson(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        }),
      (busy) => setBusyId(busy ? sessionId : null),
      "Device signed out",
      "Couldn't sign out that device",
    );

  const revokeOthers = () =>
    run(
      () => requestJson("/api/auth/sessions/others", { method: "POST" }),
      setRevokingOthers,
      "Signed out of your other devices",
      "Couldn't sign out your other devices",
    );

  return (
    <HighlightGroup className={SURFACE_STACK}>
      {sessions.length === 0 ? (
        <div
          className={cn(
            SURFACE_PANEL,
            "flex flex-col items-center gap-2 p-6 text-center",
          )}
        >
          <Icon
            className="text-ink-muted"
            icon="solar:devices-bold"
            size={22}
          />
          <span className="type-meta font-medium text-ink-muted">
            No active sessions found
          </span>
        </div>
      ) : (
        sessions.map((session) => (
          <SessionRow
            busy={busyId === session.session_id}
            disabled={busyId !== null || revokingOthers}
            key={session.session_id}
            onRevoke={() => revoke(session.session_id)}
            session={session}
          />
        ))
      )}

      {sessions.some((session) => !session.is_current) ? (
        <Button
          className={SUBMIT_CLASS}
          disabled={revokingOthers || busyId !== null}
          loading={revokingOthers}
          onClick={revokeOthers}
        >
          <Icon icon="solar:logout-2-bold" size={16} />
          Sign out all other devices
        </Button>
      ) : null}
    </HighlightGroup>
  );
}

export function DeletePanel() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, openSurface } = useDockActions();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const email = auth.user?.email ?? "";
  const ready = confirmation === DELETE_CONFIRMATION && Boolean(email);

  async function deleteAccount() {
    await requestJson("/api/account/me", {
      body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
      method: "DELETE",
    });
    await auth.signOut("local");
    closeSurface();
    router.replace("/?reason=account-deleted");
  }

  async function sendCode() {
    if (!ready || !auth.client) return;
    setSending(true);
    try {
      await requestEmailAuth(auth.client, {
        email,
        emailRedirectTo: getAuthCallbackUrl("/account"),
      });
      void openSurface(
        createVerificationSurfaceEntry(
          { email, onVerified: deleteAccount },
          { title: "Verify to delete" },
        ),
      );
    } catch (error) {
      toast(getAuthErrorMessage(error, "Couldn't send a verification code"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={SURFACE_STACK}>
      <div className={SURFACE_TILE}>
        <Mark icon="solar:danger-triangle-bold" tone="danger" />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>This can&apos;t be undone</span>
          <span className={SURFACE_META}>Your account is removed for good</span>
        </span>
      </div>
      <Input
        aria-label='Type "DELETE" to confirm'
        className={INPUT_CLASS}
        disabled={sending}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder='Type "DELETE" to confirm'
        value={confirmation}
      />
      <Button
        className={`${SURFACE_DANGER} w-full`}
        disabled={sending || !ready}
        loading={sending}
        onClick={sendCode}
      >
        <Icon icon="solar:letter-bold" size={16} />
        Send verification code
      </Button>
    </div>
  );
}
