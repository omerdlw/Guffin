"use client";

import { type JSX, useState } from "react";
import {
  type AmbientPalette,
  useAmbientTheme,
} from "@omerdlw/base-framework/ambient";
import {
  useArrival,
  useNavigationPayload,
} from "@omerdlw/base-framework/navigation";
import { BACKDROP_FILL } from "@/design/components/backdrop";
import { cn } from "@/design/ui";
import type { PublicAccount } from "@/features/account/account";
import { AccountAvatarImage } from "@/features/account/tiles";
import { BackdropProjection } from "@/features/detail/stage";
import { ProfileBio } from "./bio";
import { HERO_SIZES, profileBackdrop, profileSwatch } from "./media";

export function ProfileHero({
  account,
  palette = null,
}: {
  account: PublicAccount;
  palette?: AmbientPalette | null;
}): JSX.Element {
  const backdrop = profileBackdrop(account.backgroundUrl);
  const swatch = profileSwatch(backdrop);
  const arrival = useArrival();
  const [inherited] = useState(() => arrival?.payload.palette ?? undefined);
  const { palette: lit } = useAmbientTheme({
    image: swatch,
    initialPalette: palette?.source === swatch ? palette : inherited,
  });
  useNavigationPayload("palette", lit);
  const name = account.displayName || account.username;
  const bio = account.bio?.trim();

  return (
    <section className={cn("relative isolate w-full", HERO_SIZES)}>
      {backdrop ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-(--hero)"
        >
          <BackdropProjection className={BACKDROP_FILL} src={backdrop} />
        </div>
      ) : null}

      <div className="flex flex-col items-center px-4 pt-[calc(var(--hero)/2-var(--avatar)/2)] text-center sm:px-6">
        <div
          aria-label={name}
          className="rim relative size-(--avatar) shrink-0 overflow-hidden rounded-full bg-fill shadow-(--liquid-shadow)"
          role="img"
        >
          <AccountAvatarImage account={account} alt="" />
        </div>

        <h1 className="mt-fib-4 font-zuume type-display-sm leading-none font-bold text-balance text-ink uppercase sm:type-display-md">
          {name}
        </h1>
        {bio ? (
          <div className="mt-fib-4 w-full max-w-lg">
            <ProfileBio
              bio={bio}
              displayName={name}
              username={account.username}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
