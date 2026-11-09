"use client";

import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { useRouter } from "next/navigation";
import { updateAccountAction } from "@/features/account/actions";
import { useAccount } from "@/features/account/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { Image } from "@/design/components/image";
import { Input, inputVariants, Textarea } from "@/design/components/input";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_END,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface";
import { Switch } from "@/design/components/switch";
import { cn } from "@/design/foundations/cn";
import {
  INPUT_CLASS,
  TEXTAREA_CLASS,
  USERNAME_ERROR,
  USERNAME_PATTERN,
} from "./constants";
import { Mark } from "./shared";
import type { MediaFormSaveResult, SaveResult } from "./types";

export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { account: current, refresh } = useAccount();
  const router = useRouter();
  const toast = useToast();

  const [fields, setFields] = useState({
    bio: current?.bio ?? "",
    displayName: current?.displayName ?? "",
    isPrivate: Boolean(current?.isPrivate),
    username: current?.username ?? "",
  });
  const { bio, displayName, isPrivate, username } = fields;
  const setField =
    <K extends keyof typeof fields>(name: K) =>
    (value: (typeof fields)[K]) =>
      setFields((current) => ({ ...current, [name]: value }));

  const [result, submit, pending] = useActionState<SaveResult, FormData>(
    async () => {
      const name = displayName.trim();
      const handle = username.trim().toLowerCase();
      if (!name) return { error: "Display name is required", success: false };
      if (!USERNAME_PATTERN.test(handle)) {
        return { error: USERNAME_ERROR, success: false };
      }

      const update = await updateAccountAction({
        bio: bio.trim(),
        displayName: name,
        isPrivate,
        username: handle,
      });
      if (!update.success) {
        return {
          error:
            update.error ||
            "Your account couldn't be updated. Please try again",
          success: false,
        };
      }
      await refresh();
      return { success: true, username: update.data.username || handle };
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    toast("Profile updated");
    router.refresh();
    if (result.username !== current?.username) {
      router.replace(accountHref(result.username));
    }
    onSaved();
  }, [result]);

  return (
    <form action={submit} className={SURFACE_STACK}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Input
          className={INPUT_CLASS}
          disabled={pending}
          maxLength={80}
          name="displayName"
          onChange={(event) => setField("displayName")(event.target.value)}
          placeholder="Display Name"
          required
          value={displayName}
        />
        <Input
          className={INPUT_CLASS}
          disabled={pending}
          maxLength={30}
          name="username"
          onChange={(event) => setField("username")(event.target.value)}
          pattern="[a-zA-Z0-9_\-]{3,30}"
          placeholder="Username"
          required
          spellCheck={false}
          value={username}
        />
      </div>
      <Textarea
        className={TEXTAREA_CLASS}
        disabled={pending}
        maxLength={500}
        name="bio"
        onChange={(event) => setField("bio")(event.target.value)}
        placeholder="Bio"
        rows={4}
        value={bio}
      />
      <label
        className={cn(
          tileVariants(),
          tileVariants({ interactive: true }),
          SURFACE_TILE_END,
          "group cursor-pointer select-none",
        )}
      >
        <Mark icon={isPrivate ? "solar:lock-keyhole-bold" : "solar:eye-bold"} />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>
            {isPrivate ? "Private profile" : "Public profile"}
          </span>
          <span className={SURFACE_META}>
            {isPrivate
              ? "Only people you approve can see your activity"
              : "Anyone can see your activity"}
          </span>
        </span>
        <Switch
          aria-label="Private profile"
          checked={isPrivate}
          disabled={pending}
          onCheckedChange={setField("isPrivate")}
        />
      </label>
      <Button
        intent="primary"
        width="full"
        disabled={pending}
        loading={pending}
        type="submit"
      >
        Save changes
      </Button>
    </form>
  );
}

function Preview({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-card bg-fill ring-1 ring-inset ring-edge">
      {children}
    </div>
  );
}

function UrlInput({
  disabled,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="relative flex w-full items-center">
      <Input
        className={cn(
          inputVariants(),
          "h-10 w-full pl-4 type-body",
          value ? "pr-9" : "pr-4",
        )}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="url"
        value={value}
      />
      {value ? (
        <Button
          aria-label="Clear input"
          className="absolute right-1 rounded-tile text-ink-muted"
          icon
          intent="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <Icon icon="solar:close-bold" size={14} />
        </Button>
      ) : null}
    </div>
  );
}

export function MediaForm({ onSaved }: { onSaved: () => void }) {
  const { account: current, refresh } = useAccount();
  const router = useRouter();
  const toast = useToast();

  const [images, setImages] = useState({
    avatarUrl: current?.avatarUrl ?? "",
    backgroundUrl: current?.backgroundUrl ?? "",
  });
  const { avatarUrl, backgroundUrl } = images;
  const setImage = (name: keyof typeof images) => (value: string) =>
    setImages((current) => ({ ...current, [name]: value }));

  const [result, submit, pending] = useActionState<
    MediaFormSaveResult,
    FormData
  >(async () => {
    const update = await updateAccountAction({
      avatarUrl: avatarUrl.trim() || null,
      backgroundUrl: backgroundUrl.trim() || null,
    });
    if (!update.success) {
      return {
        error:
          update.error || "Your images couldn't be updated. Please try again",
        success: false,
      };
    }
    await refresh();
    return { success: true };
  }, null);

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    toast("Images updated");
    router.refresh();
    onSaved();
  }, [result]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <Preview>
            <div className="center relative size-20 shrink-0 overflow-hidden rounded-full bg-veil text-ink-muted">
              {avatarUrl ? (
                <Image
                  alt="Avatar preview"
                  className="size-full object-cover"
                  src={avatarUrl}
                />
              ) : (
                <Icon icon="solar:user-circle-bold" size={24} />
              )}
            </div>
          </Preview>
          <UrlInput
            disabled={pending}
            onChange={setImage("avatarUrl")}
            placeholder="Avatar image URL"
            value={avatarUrl}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Preview>
            {backgroundUrl ? (
              <Image
                alt="Page background preview"
                className="size-full object-cover"
                src={backgroundUrl}
              />
            ) : (
              <Icon
                className="text-ink-muted"
                icon="solar:wallpaper-bold"
                size={24}
              />
            )}
          </Preview>
          <UrlInput
            disabled={pending}
            onChange={setImage("backgroundUrl")}
            placeholder="Page background URL"
            value={backgroundUrl}
          />
        </div>
      </div>

      <Button
        intent="primary"
        width="full"
        disabled={pending}
        loading={pending}
        type="submit"
      >
        Save changes
      </Button>
    </form>
  );
}
