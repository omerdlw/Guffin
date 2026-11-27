"use client";

import { defineSurface } from "@/design/surface/define";
import { SurfaceProse } from "@/design/surface/prose";
import { SurfacePart, SurfaceStage } from "@/design/surface/surface";

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
