"use client";

import { type ChangeEvent, useActionState, useEffect, useState } from "react";
import type { SurfaceEntry } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { AUTH_INPUT_CLASS } from "@/features/auth/constants";
import { useAuth } from "@/features/auth/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@omerdlw/base-framework/ui";
import { Input } from "@/design/components/input";
import { SurfaceProse } from "@/design/components/surface-prose";
import { updateAccountAction } from "./actions";
import { FALLBACK_BIO_TEXT, SETUP_DEFAULT_TITLE } from "./constants";
import type { AccountBioData, SetupResult } from "./types";

function AccountSetupSurface({
  close,
}: {
  close?: (result?: { success?: boolean }) => void;
}) {
  const auth = useAuth();
  const toast = useToast();
  const [fields, setFields] = useState(() => ({
    displayName: String(auth.user?.user_metadata?.full_name ?? "").trim(),
    username: "",
  }));

  const [result, submit, pending] = useActionState<SetupResult, FormData>(
    async () => {
      const username = fields.username.trim();
      if (!username) return { error: "Username is required", success: false };
      const update = await updateAccountAction({
        displayName: fields.displayName.trim() || username,
        username,
      });
      if (!update.success) {
        return {
          error:
            update.error ||
            "Couldn't finish setting up your account. Try a different username",
          success: false,
        };
      }
      return { success: true, username: update.data.username || username };
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

  const bindField =
    (name: keyof typeof fields) => (event: ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [name]: event.target.value }));

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <Input
        aria-label="Username"
        autoComplete="username"
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="username"
        onChange={bindField("username")}
        placeholder="Username"
        required
        value={fields.username}
      />
      <Input
        aria-label="Display name"
        autoComplete="name"
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="displayName"
        onChange={bindField("displayName")}
        placeholder="Display name (optional)"
        value={fields.displayName}
      />
      <Button
        intent="primary"
        width="full"
        disabled={pending || !fields.username.trim()}
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

function AccountBioSurface({ bio }: { bio?: string | null }) {
  return <SurfaceProse text={bio || FALLBACK_BIO_TEXT} />;
}

export function createAccountBioSurfaceEntry({
  bio,
  displayName,
  username,
}: AccountBioData): SurfaceEntry {
  const name = displayName?.trim() || username || SETUP_DEFAULT_TITLE;
  return {
    component: AccountBioSurface,
    props: { bio },
    title: `${name} Bio`,
  };
}
