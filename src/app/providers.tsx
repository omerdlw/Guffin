"use client";

import "@/design/icons";
import { createElement, type JSX, type ReactNode } from "react";
import {
  ambientModule,
  configureAmbient,
} from "@omerdlw/base-framework/ambient";
import { contextMenuModule } from "@omerdlw/base-framework/context-menu";
import { controlsModule } from "@omerdlw/base-framework/controls";
import { dockModule } from "@omerdlw/base-framework/dock";
import { type AppRegistryEntry, Compose } from "@omerdlw/base-framework/kernel";
import { modalModule } from "@omerdlw/base-framework/modal";
import {
  configureNavigation,
  navigationModule,
  pathOf,
} from "@omerdlw/base-framework/navigation";
import { notificationModule } from "@omerdlw/base-framework/notification";
import { CoreProvider } from "@omerdlw/base-framework/provider";
import { ThemeProvider } from "@omerdlw/base-framework/theme";
import { TooltipProvider, UiProvider } from "@omerdlw/base-framework/ui";
import { ActionArrival } from "@/design/components/action-content";
import { CardTilt } from "@/design/components/card-tilt";
import { Logo } from "@/design/components/logo";
import { NoTab } from "@/design/components/no-tab";
import { TipHost } from "@/design/components/tip-host";
import { DockCompact } from "@/design/dock/compact";
import { GlassEngine } from "@/design/glass/engine";
import { LiquidTouch } from "@/design/glass/liquid-touch";
import { SurfaceStyle } from "@/design/surface/surface";
import { themes } from "@/design/theme";
import { moduleMotion } from "@/design/theme/motion";
import { ui } from "@/design/ui";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account/model";
import {
  AccountGuard,
  AccountProvider,
  SocialSync,
} from "@/features/account/provider";
import { BackdropPreloader } from "@/features/artwork/components/backdrop-preloader";
import { AuthListener, AuthProvider } from "@/features/auth/provider";
import { ReviewLinks } from "@/features/reviews/components/review-links";
import { SearchDockCommand } from "@/features/search/components/search-command";
import { EngineProvider } from "@/motion/core/provider";
import { Cursor } from "@/motion/effects/cursor";
import { TintedFavicon } from "@/motion/effects/intermission";
import { AMBIENT_ANALYSIS } from "@/shared/ambient";
import { project } from "@/shared/site";

const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: "dock",
    items: {
      "/": {
        description: project.description,
        icon: createElement(Logo, { size: 22 }),
        name: "home",
        title: "Guffin",
        path: "/",
        stackOrder: -2,
      },
      "/top-100": {
        description: "The IMDb Top 100 on one wall",
        icon: "solar:gallery-bold",
        name: "top-100",
        title: "IMDb Top 100",
        path: "/top-100",
      },
      "/account": {
        description: "Manage your account",
        icon: DEFAULT_ACCOUNT_ICON,
        name: "account",
        title: "Account",
        path: "/account",
        stackOrder: -1,
      },
    },
  },
]);

const TOOLTIP_DELAY = 300;
const TOOLTIP_SKIP_DELAY = 150;

const FILM_PAGE = /^\/(?:movie|person)\/[^/]+$/;

configureAmbient({ analysis: AMBIENT_ANALYSIS });

configureNavigation({
  intent: { match: (href) => FILM_PAGE.test(pathOf(href)) },
});

const MODULES = Object.freeze([
  ambientModule,
  navigationModule,
  dockModule,
  controlsModule,
  contextMenuModule,
  modalModule,
  notificationModule,
]);

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <Compose
        providers={[
          AuthProvider,
          AccountProvider,
          [ThemeProvider, { motion: moduleMotion, themes }],
          [UiProvider, { ui }],
          [
            TooltipProvider,
            {
              delayDuration: TOOLTIP_DELAY,
              skipDelayDuration: TOOLTIP_SKIP_DELAY,
            },
          ],
          [
            CoreProvider,
            { modules: MODULES, registryEntries: APP_REGISTRY_ENTRIES },
          ],
        ]}
      >
        <AuthListener />
        <AccountGuard />
        <SearchDockCommand />
        <DockCompact />
        <SurfaceStyle />
        <SocialSync />
        <BackdropPreloader />
        <EngineProvider drive>
          {children}
          <TintedFavicon />
        </EngineProvider>
        <Cursor />
        <GlassEngine />
        <LiquidTouch />
        <NoTab />
        <TipHost />
        <CardTilt />
        <ReviewLinks />
        <ActionArrival />
      </Compose>
    </>
  );
}
