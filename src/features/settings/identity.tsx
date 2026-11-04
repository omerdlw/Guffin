"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { DockCardBanner } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { useRouter } from "next/navigation";
import { updateAccountAction } from "@/features/account/actions";
import { useAccount } from "@/features/account/provider";
import { accountHref } from "@/lib/project";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Input, Switch, Textarea } from "@/ui/form";
import { AdaptiveImage, Icon } from "@/ui/media";
import {
  SHELL,
  SURFACE_FIELD,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE,
  SURFACE_TILE_END,
  SURFACE_TILE_HOVER,
  SURFACE_TITLE,
} from "@/ui/tokens";
import {
  DEFAULT_BANNER_POSITION,
  INPUT_CLASS,
  SUBMIT_CLASS,
  TEXTAREA_CLASS,
  USERNAME_ERROR,
  USERNAME_PATTERN,
} from "./constants";
import { Mark } from "./shared";
import type { MediaFormSaveResult, SaveResult } from "./types";
import { bannerY } from "./utils";

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
          SURFACE_FIELD,
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
          className="center absolute right-1 size-8 cursor-pointer rounded-tile p-0 text-ink-muted hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink"
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <Icon icon="solar:close-bold" size={14} />
        </Button>
      ) : null}
    </div>
  );
}

function BannerSlider({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (value: number) => void;
  value: number;
}) {
  const track = useRef<HTMLDivElement>(null);

  const follow = (clientY: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.height <= 0 || disabled) return;
    const ratio = (clientY - box.top) / box.height;
    onChange(Math.min(100, Math.max(0, Math.round(ratio * 100))));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    follow(event.clientY);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    event.stopPropagation();
    follow(event.clientY);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowDown: Math.min(100, value + 5),
      ArrowUp: Math.max(0, value - 5),
      End: 100,
      Home: 0,
    }[event.key];
    if (disabled || next === undefined) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div
      aria-label="Banner vertical alignment"
      aria-orientation="vertical"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className={cn(
        "group/slider flex w-10 shrink-0 cursor-ns-resize flex-col items-center justify-between self-stretch rounded-card bg-fill py-3 ring-1 ring-inset ring-edge select-none touch-none hover:bg-fill-hover focus-visible:bg-fill-hover",
        disabled && "pointer-events-none opacity-50",
      )}
      data-no-surface-drag="true"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      tabIndex={disabled ? -1 : 0}
    >
      <Icon
        className="shrink-0 text-ink-muted group-hover/slider:text-ink-body group-focus-visible/slider:text-ink-body group-has-focus-visible/slider:text-ink-body"
        icon="solar:alt-arrow-up-linear"
        size={12}
      />
      <div
        className="relative my-1.5 w-1.5 flex-1 rounded-full bg-fill-active"
        ref={track}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-ink-muted"
          style={{ transform: `scaleY(${value / 100})` }}
        />
        <div
          className="ui-glyph absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white group-hover/slider:scale-110 group-active/slider:scale-125"
          style={{ top: `${value}%` }}
        />
      </div>
      <Icon
        className="shrink-0 text-ink-muted group-hover/slider:text-ink-body group-focus-visible/slider:text-ink-body group-has-focus-visible/slider:text-ink-body"
        icon="solar:alt-arrow-down-linear"
        size={12}
      />
    </div>
  );
}

function DockPreview({
  avatarUrl,
  bannerUrl,
  displayName,
  position,
  username,
}: {
  avatarUrl: string;
  bannerUrl: string;
  displayName?: string;
  position: number;
  username?: string;
}) {
  return (
    <div
      className={`relative flex h-[60px] w-full items-center justify-between overflow-hidden rounded-card p-1.5 pr-2.5 backdrop-blur-lg select-none ${SHELL}`}
    >
      {bannerUrl ? (
        <DockCardBanner
          bannerPosition={`center ${position}%`}
          bannerUrl={bannerUrl}
          isActive
        />
      ) : null}
      <div className="pointer-events-none relative z-10 flex w-full items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="center relative size-12 shrink-0 overflow-hidden rounded-inset bg-fill text-ink">
            {avatarUrl ? (
              <AdaptiveImage
                alt="Preview avatar"
                className="size-full object-cover"
                src={avatarUrl}
              />
            ) : (
              <Icon icon="solar:user-circle-bold" size={26} />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <span
              className={`truncate type-copy leading-5 font-semibold text-ink`}
            >
              {displayName || "Your Name"}
            </span>
            <span className={`truncate type-body text-ink-body`}>
              @{username || "username"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {[
            "solar:logout-2-bold",
            "solar:settings-bold",
            "solar:bell-bold",
          ].map((icon) => (
            <div
              className={`center size-9 rounded-full text-ink-body`}
              key={icon}
            >
              <Icon icon={icon} size={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MediaForm({ onSaved }: { onSaved: () => void }) {
  const { account: current, refresh } = useAccount();
  const router = useRouter();
  const toast = useToast();

  const [avatarUrl, setAvatarUrl] = useState(current?.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(current?.bannerUrl ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(
    current?.backgroundUrl ?? "",
  );
  const [bannerPosition, setBannerPosition] = useState(
    current?.bannerPosition ?? DEFAULT_BANNER_POSITION,
  );
  const position = bannerY(bannerPosition);

  const [result, submit, pending] = useActionState<
    MediaFormSaveResult,
    FormData
  >(async () => {
    const update = await updateAccountAction({
      avatarUrl: avatarUrl.trim() || null,
      backgroundUrl: backgroundUrl.trim() || null,
      bannerPosition: bannerPosition.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
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
            <div className="center relative size-20 shrink-0 overflow-hidden rounded-full bg-black/60 text-ink-muted">
              {avatarUrl ? (
                <AdaptiveImage
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
            onChange={setAvatarUrl}
            placeholder="Avatar image URL"
            value={avatarUrl}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Preview>
            {backgroundUrl ? (
              <AdaptiveImage
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
            onChange={setBackgroundUrl}
            placeholder="Page background URL"
            value={backgroundUrl}
          />
        </div>
      </div>

      <div className="flex w-full items-stretch gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <DockPreview
            avatarUrl={avatarUrl}
            bannerUrl={bannerUrl}
            displayName={current?.displayName}
            position={position}
            username={current?.username}
          />
          <UrlInput
            disabled={pending}
            onChange={setBannerUrl}
            placeholder="Dock banner image URL"
            value={bannerUrl}
          />
        </div>
        {bannerUrl ? (
          <BannerSlider
            disabled={pending}
            onChange={(y) => setBannerPosition(`center ${y}%`)}
            value={position}
          />
        ) : null}
      </div>

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
