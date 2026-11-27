"use client";

import { SurfacePart, SurfaceStage } from "@/design/surface/surface";
import { SurfaceProse } from "@/design/surface/prose";
import { defineSurface } from "@/design/surface/define";

interface AccountBioData {
  bio?: string | null;
  displayName?: string;
  username?: string;
}

const FALLBACK_BIO_TEXT = "No bio provided";

const SETUP_DEFAULT_TITLE = "Account";

function AccountBioSurface({ bio }: { bio?: string | null }) {
  return (
    <SurfaceStage>
      <SurfacePart name="item">
        <SurfaceProse text={bio || FALLBACK_BIO_TEXT} />
      </SurfacePart>
    </SurfaceStage>
  );
}

export const accountBioSurface = defineSurface<AccountBioData>({
  component: AccountBioSurface,
  title: ({ displayName, username }) =>
    `${displayName?.trim() || username || SETUP_DEFAULT_TITLE} Bio`,
});
