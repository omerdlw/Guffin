import { type JSX, type ReactNode, Suspense } from "react";
import { DockClear } from "@/design/components/dock-clear";
import { PAGE_CLASS } from "@/design/foundations/layout";
import { ProfileDock } from "@/features/profile/dock";
import { ProfileHero } from "@/features/profile/hero";
import { profileBackdrop, profileSwatch } from "@/features/profile/media";
import { loadProfile } from "@/features/profile/server";
import { ProfileHeadSkeleton } from "@/features/profile/skeleton";
import { ProfileTabs } from "@/features/profile/tabs";
import { ProfileStageRoot } from "@/features/profile/motion";
import { getAmbientPalette } from "@/infrastructure/tmdb/server";

async function ProfileHead({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<JSX.Element> {
  const { username } = await params;
  const { account } = await loadProfile(username);
  const palette = await getAmbientPalette(
    profileSwatch(profileBackdrop(account.backgroundUrl)),
  );
  return (
    <>
      <ProfileDock account={account} />
      <ProfileTabs username={account.username} />
      <ProfileHero account={account} palette={palette} />
    </>
  );
}

export default function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ username: string }>;
}): JSX.Element {
  return (
    <ProfileStageRoot>
      <main
        id="main"
        className={`ui-scene overflow-x-clip ${PAGE_CLASS}`}
        data-cinematic=""
      >
        <DockClear extra="2rem" />
        <Suspense fallback={<ProfileHeadSkeleton />}>
          <ProfileHead params={params} />
        </Suspense>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-fib-5 px-4 pt-fib-5 sm:px-6">
          {children}
        </div>
      </main>
    </ProfileStageRoot>
  );
}
