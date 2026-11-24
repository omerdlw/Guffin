"use client";

import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useDockActions,
  useDockRegistration,
  useDockSelector,
} from "@omerdlw/base-framework/dock";
import { REGISTRY_SOURCES } from "@omerdlw/base-framework/kernel";
import { report } from "@omerdlw/base-framework/utils";
import { usePathname } from "next/navigation";
import { useKeepDockCard } from "@/design/dock-compact";
import { useDockCommands } from "@/design/dock-commands";
import {
  lazySurface,
  preloadOnIntent,
  useAheadOfOpen,
} from "@/design/lazy-surface";

type SearchActionComponent = ComponentType<{ onClose?: () => void }>;

interface SearchModule {
  SearchAction: SearchActionComponent;
  SearchStyle: ComponentType;
}

const SEARCH_ICON = "solar:magnifer-linear";

const SEARCH_CLOSE_ICON = "solar:close-bold";

const SEARCH_ACTION_KEY = "search.open";

const SEARCH_ACTION_ORDER = -20;

const SEARCH_REGISTRATION = {
  priority: 1000,
  source: REGISTRY_SOURCES.DYNAMIC,
} as const;

// From the compact dock, search opens as a surface instead of unfolding the
// card: the dock grows straight out of the compact row and folds back into it.
const searchSurface = lazySurface(() =>
  import("./search-surface").then((m) => m.searchSurface),
);

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
  const { openSurface } = useDockActions();

  useEffect(
    () =>
      preloadOnIntent(
        [{ preload: () => loadSearchAction().then(setLoaded) }, searchSurface],
        window,
      ),
    [],
  );

  const toggle = useCallback(() => {
    if (openPath === pathname) {
      setOpenPath(null);
      return;
    }
    if (compact) {
      searchSurface
        .open(openSurface)
        .catch((error: unknown) => report("SearchDockCommand", error));
      return;
    }
    loadSearchAction().then(
      (module) => {
        setLoaded(module);
        setOpenPath(pathname);
      },
      (error: unknown) => report("SearchDockCommand", error),
    );
  }, [compact, openPath, openSurface, pathname]);

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
  useKeepDockCard(open);

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

  useDockCommands(actions);
  const SearchStyle = ahead ? loaded?.SearchStyle : null;
  return SearchStyle ? <SearchStyle /> : null;
}
