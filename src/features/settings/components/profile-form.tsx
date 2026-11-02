"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import { accountHref } from "@/config/routes";
import {
  Button,
  SURFACE_TEXT,
  Input,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_HOVER,
  SURFACE_TITLE,
  Switch,
  Textarea,
} from "@/ui";
import { updateAccountAction, useAccount } from "@/features/account";
import { INPUT_CLASS, Mark, SUBMIT_CLASS, TEXTAREA_CLASS } from "./form";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;
const USERNAME_ERROR =
  "Username must be 3-30 characters and contain letters, numbers, _ or -";

type SaveResult =
  | { success: true; username: string }
  | { error: string; success: false }
  | null;

export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const { account: current, refresh } = useAccount();
  const router = useRouter();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(current?.displayName ?? "");
  const [username, setUsername] = useState(current?.username ?? "");
  const [bio, setBio] = useState(current?.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(Boolean(current?.isPrivate));

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
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Display Name"
          required
          value={displayName}
        />
        <Input
          className={INPUT_CLASS}
          disabled={pending}
          maxLength={30}
          name="username"
          onChange={(event) => setUsername(event.target.value)}
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
        onChange={(event) => setBio(event.target.value)}
        placeholder="Bio"
        rows={4}
        value={bio}
      />
      <label
        className={cn(
          SURFACE_TILE,
          SURFACE_TILE_HOVER,
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
          onCheckedChange={setIsPrivate}
        />
      </label>
      <Button
        className={SUBMIT_CLASS}
        disabled={pending}
        loading={pending}
        type="submit"
      >
        Save changes
      </Button>
    </form>
  );
}
