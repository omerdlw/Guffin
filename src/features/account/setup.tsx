"use client";

import { useActionState, useEffect, useState } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { AUTH_INPUT_CLASS } from "@/features/auth/constants";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@/ui/button";
import { Input } from "@/ui/form";
import { SurfaceProse } from "@/ui/surface";
import { updateAccountAction } from "./actions";
import { FALLBACK_BIO_TEXT, SETUP_DEFAULT_TITLE } from "./constants";
import type {
  AccountBioData,
  AccountBioSurfaceProps,
  SetupResult,
} from "./types";
import { SURFACE_PRIMARY } from "@/ui/tokens";

function AccountSetupSurface({
  close,
}: {
  close?: (result?: { success?: boolean }) => void;
}) {
  const auth = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(() =>
    String(auth.user?.user_metadata?.full_name ?? "").trim(),
  );

  const [result, submit, pending] = useActionState<SetupResult, FormData>(
    async () => {
      const name = username.trim();
      if (!name) return { error: "Username is required", success: false };
      const update = await updateAccountAction({
        displayName: displayName.trim() || name,
        username: name,
      });
      if (!update.success) {
        return {
          error:
            update.error ||
            "Couldn't finish setting up your account. Try a different username",
          success: false,
        };
      }
      return { success: true, username: update.data.username || name };
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    close?.({ success: true });
    window.location.replace(accountHref(result.username));
  }, [close, result, toast]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <Input
        aria-label="Username"
        autoComplete="username"
        autoFocus
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="username"
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        required
        value={username}
      />
      <Input
        aria-label="Display name"
        autoComplete="name"
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="displayName"
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (optional)"
        value={displayName}
      />
      <Button
        className={`${SURFACE_PRIMARY} w-full`}
        disabled={pending || !username.trim()}
        loading={pending}
        type="submit"
      >
        Continue
      </Button>
    </form>
  );
}

export function createAccountSetupSurfaceEntry(): SurfaceEntry {
  return { component: AccountSetupSurface, title: "Set up account" };
}

export function createAccountBioSurfaceEntry(
  data: AccountBioData = {},
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  const account = data.account || data.profile || {};
  const username = data.username || account.username || "";

  const displayName = String(
    data.displayName ||
      account.displayName ||
      account.display_name ||
      username ||
      SETUP_DEFAULT_TITLE,
  ).trim();

  const bio = data.bio ?? account.bio ?? "";

  return {
    component: AccountBioSurface,
    title: `${displayName} Bio`,
    props: { bio, data },
    ...config,
  };
}

function AccountBioSurface({ bio, data = {} }: AccountBioSurfaceProps) {
  const displayBio =
    bio ?? data.bio ?? (data.account || data.profile)?.bio ?? "";

  return <SurfaceProse text={displayBio || FALLBACK_BIO_TEXT} />;
}
