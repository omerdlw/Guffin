"use client";

import { SurfaceProse } from "@/design/components/surface-prose";
import { defineSurface } from "@/design/surface-definition";

interface AccountBioData {
  bio?: string | null;
  displayName?: string;
  username?: string;
}

const FALLBACK_BIO_TEXT = "No bio provided";

const SETUP_DEFAULT_TITLE = "Account";

function AccountBioSurface({ bio }: { bio?: string | null }) {
  return <SurfaceProse text={bio || FALLBACK_BIO_TEXT} />;
}

export const accountBioSurface = defineSurface<AccountBioData>({
  component: AccountBioSurface,
  title: ({ displayName, username }) =>
    `${displayName?.trim() || username || SETUP_DEFAULT_TITLE} Bio`,
});
