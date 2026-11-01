"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import { accountHref } from "@/config/routes";
import { Button, Input, Textarea } from "@/ui";
import { updateAccountAction, useAccount } from "@/features/account";
import { INPUT_CLASS, TEXTAREA_CLASS, useSubmitClass } from "./form";

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
  const submitClass = useSubmitClass();

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
    <form action={submit} className="flex flex-col gap-2.5">
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
      <Button
        aria-checked={isPrivate}
        className="flex h-10 w-full items-center justify-between rounded-card bg-fill pr-2 pl-4 ring-1 ring-inset ring-edge hover:bg-fill-hover hover:ring-edge-hover"
        disabled={pending}
        onClick={() => setIsPrivate(!isPrivate)}
        role="switch"
      >
        <span className="type-body font-medium text-ink">
          {isPrivate ? "Private profile" : "Public profile"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-11 shrink-0 rounded-full p-0.5 ring-1 ring-inset",
            isPrivate ? "bg-white ring-white" : "bg-fill-hover ring-edge",
          )}
        >
          <span
            className={cn(
              "ui-drift size-5 rounded-full",
              isPrivate
                ? "translate-x-5 bg-black"
                : "translate-x-0 bg-ink-body shadow-knob",
            )}
          />
        </span>
      </Button>
      <Button
        className={submitClass}
        disabled={pending}
        loading={pending}
        type="submit"
      >
        Save changes
      </Button>
    </form>
  );
}
