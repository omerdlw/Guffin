"use client";

import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import {
  REGISTRY_SOURCES,
  type RegistryLifecycle,
} from "@omerdlw/base-framework/kernel";
import { report } from "@omerdlw/base-framework/utils";
import { useDockCommands } from "@/design/dock/commands";
import { useHoldDockCompact, useKeepDockCard } from "@/design/dock/compact";
import { preloadOnIntent, useAheadOfOpen } from "@/design/surface/lazy";

type SearchActionComponent = ComponentType<{
  compact?: boolean;
  onClose?: () => void;
}>;

interface SearchModule {
  SearchAction: SearchActionComponent;
  SearchStyle: ComponentType;
}

const SEARCH_ICON = "solar:magnifer-linear";

const SEARCH_CLOSE_ICON = "solar:close-bold";

const SEARCH_ACTION_KEY = "search.open";

const SEARCH_ACTION_ORDER = -20;

// Closing search is a tap, not a page change: drop it now rather than after
// the dock's route-bridging grace (which held it on screen ~600ms).
const SEARCH_REGISTRATION = {
  lifecycle: "immediate" satisfies RegistryLifecycle,
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

let pending: Promise<SearchModule> | null = null;

function loadSearchAction() {
  pending ??= import("./search-action").then(
    ({ SearchAction, SearchStyle }) => ({ SearchAction, SearchStyle }),
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

export function SearchDockCommand(): ReactNode {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<SearchModule | null>(null);
  const ahead = useAheadOfOpen();
  const SearchAction = loaded?.SearchAction ?? null;
  const open = openPath === pathname && SearchAction !== null;
  const frontPath = useDockSelector((state) => state.activeItem?.path ?? null);
  const compact = useDockSelector((state) => state.compact && !state.expanded);

  useEffect(
    () =>
      preloadOnIntent(
        [{ preload: () => loadSearchAction().then(setLoaded) }],
        window,
      ),
    [],
  );

  // Opened from the compact row, search stays in it: the row turns into
  // the field and the dock stays compact while it is open.
  const [inRow, setInRow] = useState(false);
  const toggle = useCallback(() => {
    if (openPath === pathname) {
      setOpenPath(null);
      return;
    }
    setInRow(compact);
    loadSearchAction().then(
      (module) => {
        setLoaded(module);
        setOpenPath(pathname);
      },
      (error: unknown) => report("SearchDockCommand", error),
    );
  }, [compact, openPath, pathname]);

  const close = useCallback(() => setOpenPath(null), []);

  const dock = useMemo(
    () =>
      open && SearchAction
        ? {
            action: <SearchAction compact={inRow} onClose={close} />,
            ...(frontPath ? { path: frontPath } : {}),
          }
        : null,
    [SearchAction, close, frontPath, inRow, open],
  );
  useDockRegistration(dock, SEARCH_REGISTRATION);
  useKeepDockCard(open && !inRow);
  useHoldDockCompact(open && inRow);

  const actions = useMemo(
    () => [
      {
        icon: open ? SEARCH_CLOSE_ICON : SEARCH_ICON,
        key: SEARCH_ACTION_KEY,
        onClick: toggle,
        order: SEARCH_ACTION_ORDER,
        // Hidden while search is open in the compact row: no tooltip, or
        // one left open from the tap would hang at the page's corner.
        tooltip: open ? (inRow ? undefined : "Close search") : "Search",
      },
    ],
    [inRow, open, toggle],
  );

  useDockCommands(actions);
  const SearchStyle = ahead ? loaded?.SearchStyle : null;
  return SearchStyle ? <SearchStyle /> : null;
}
