"use client";

import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useDockContextActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { report } from "@omerdlw/base-framework/utils";
import { usePathname } from "next/navigation";
import { preloadOnIntent } from "@/design/lazy-surface";

// The dock's search button, on every page. The search itself (its drawer,
// results and their stages) loads on the first sign of a person at the page,
// as the dock surfaces do, so a page that is only read never downloads it.

type SearchActionComponent = ComponentType<{ onClose?: () => void }>;

const SEARCH_ICON = "solar:magnifer-linear";

const SEARCH_CLOSE_ICON = "solar:close-bold";

const SEARCH_ACTION_KEY = "search.open";

const SEARCH_ACTION_ORDER = -20;

const SEARCH_REGISTRATION = {
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

let pending: Promise<SearchActionComponent> | null = null;

function loadSearchAction() {
  pending ??= import("./search-action").then(
    (module) => module.SearchAction,
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

export function SearchDockCommand(): null {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [SearchAction, setSearchAction] =
    useState<SearchActionComponent | null>(null);
  const open = openPath === pathname && SearchAction !== null;
  const frontPath = useDockSelector((state) => state.activeItem?.path ?? null);

  useEffect(() => {
    const keep = (action: SearchActionComponent) =>
      setSearchAction(() => action);
    return preloadOnIntent(
      [{ preload: () => loadSearchAction().then(keep) }],
      window,
    );
  }, []);

  const toggle = useCallback(() => {
    if (openPath === pathname) {
      setOpenPath(null);
      return;
    }
    // Opens once the search has loaded; on intent it already has.
    loadSearchAction().then(
      (action) => {
        setSearchAction(() => action);
        setOpenPath(pathname);
      },
      (error: unknown) => report("SearchDockCommand", error),
    );
  }, [openPath, pathname]);

  const close = useCallback(() => setOpenPath(null), []);

  const dock = useMemo(
    () =>
      open && SearchAction
        ? {
            action: <SearchAction onClose={close} />,
            ...(frontPath ? { path: frontPath } : {}),
          }
        : null,
    [SearchAction, close, frontPath, open],
  );
  useDockRegistration(dock, SEARCH_REGISTRATION);

  const actions = useMemo(
    () => [
      {
        icon: open ? SEARCH_CLOSE_ICON : SEARCH_ICON,
        key: SEARCH_ACTION_KEY,
        onClick: toggle,
        order: SEARCH_ACTION_ORDER,
        tooltip: open ? "Close search" : "Search",
      },
    ],
    [open, toggle],
  );

  useDockContextActions(actions);
  return null;
}
