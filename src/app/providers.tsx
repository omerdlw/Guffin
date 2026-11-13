"use client";

import { createElement, type JSX, type ReactNode } from "react";
import { ambientModule } from "@omerdlw/base-framework/ambient";
import { contextMenuModule } from "@omerdlw/base-framework/context-menu";
import { controlsModule } from "@omerdlw/base-framework/controls";
import { dockModule } from "@omerdlw/base-framework/dock";
import { type AppRegistryEntry, Compose } from "@omerdlw/base-framework/kernel";
import { modalModule } from "@omerdlw/base-framework/modal";
import {
  configureNavigation,
  navigationModule,
} from "@omerdlw/base-framework/navigation";
import { notificationModule } from "@omerdlw/base-framework/notification";
import { CoreProvider } from "@omerdlw/base-framework/provider";
import { ThemeProvider } from "@omerdlw/base-framework/theme";
import { TooltipProvider, UiProvider } from "@omerdlw/base-framework/ui";
import { Logo } from "@/design/components/logo";
import { Passage } from "@/design/components/passage";
import { themes } from "@/design/theme";
import { ui } from "@/design/ui";
import { DEFAULT_ACCOUNT_ICON } from "@/features/account/constants";
import {
  AccountGuard,
  AccountProvider,
  SocialRealtimeSync,
} from "@/features/account/provider";
import { BackdropPreloader } from "@/features/artwork/artwork";
import { AuthListener, AuthProvider } from "@/features/auth/provider";
import { SearchDockCommand } from "@/features/search/action";
import { ThemeDockCommand } from "@/features/theme/command";
import { project } from "@/lib/project";
import { ThemeSync } from "@/lib/theme";
import { Cursor } from "@/motion/cursor";
import { isFilmPage } from "@/motion/dom";
import { EngineProvider } from "@/motion/react";
import { TintedFavicon } from "@/motion/screen";
import { motion } from "@/motion/time";

const APP_REGISTRY_ENTRIES: readonly AppRegistryEntry[] = Object.freeze([
  {
    type: "dock",
    items: {
      "/": {
        description: project.description,
        icon: createElement(Logo, { size: 22 }),
        name: "home",
        title: "Guffin - Home",
        path: "/",
        stackOrder: -2,
      },
      "/oscars": {
        description: "Every Best Picture winner, cast in gold",
        icon: "solar:cup-star-bold",
        name: "oscars",
        title: "Best Picture",
        path: "/oscars",
      },
      "/top-100": {
        description: "The IMDb Top 100 on one wall",
        icon: "solar:gallery-bold",
        name: "top-100",
        title: "IMDb Top 100",
        path: "/top-100",
      },
      "/directors": {
        description: "Twenty masters, each among their films",
        icon: "solar:videocamera-record-bold",
        name: "directors",
        title: "Directors",
        path: "/directors",
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

configureNavigation({ intent: { match: isFilmPage } });

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
      <ThemeSync />
      <Compose
        providers={[
          AuthProvider,
          AccountProvider,
          [ThemeProvider, { motion, themes }],
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
        <ThemeDockCommand />
        <SocialRealtimeSync />
        <BackdropPreloader />
        <EngineProvider drive>
          {children}
          <Passage />
          <TintedFavicon />
        </EngineProvider>
        <Cursor />
      </Compose>
    </>
  );
}
