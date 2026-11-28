// TEMPORARY dev diagnostic for "every route stays on its loading skeleton
// until a refresh". When a route skeleton ([data-loading]) outlives STUCK_MS,
// it logs what React's Suspense boundary is waiting on, what is still loading,
// and the recent timeline. Browser errors are forwarded to
// .next/dev/logs/next-development.log, so the next occurrence is on record.
// Remove once the cause is found.

const STUCK_MS = 10_000;
const CHECK_MS = 2_000;
const JOURNAL_SIZE = 60;

interface Flight {
  url: string;
  start: number;
  headersAt: number | null;
  action: boolean;
}

const t0 = performance.now();
const now = () => Math.round(performance.now() - t0);
const short = (url: string) => url.replace(location.origin, "").slice(0, 140);
const journal: string[] = [];
const note = (event: string) => {
  journal.push(`${now()} ${event}`);
  if (journal.length > JOURNAL_SIZE) journal.shift();
};

function describe(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") {
    return typeof value === "function"
      ? `fn ${(value as { name?: string }).name || "anon"}`
      : typeof value === "string"
        ? value.slice(0, 120)
        : value;
  }
  if (depth > 1) return Object.prototype.toString.call(value);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {
    kind: (value as object).constructor?.name ?? "Object",
  };
  for (const key of [
    "status",
    "reason",
    "value",
    "_debugInfo",
    "displayName",
    "href",
    "src",
  ]) {
    if (key in record) out[key] = describe(record[key], depth + 1);
  }
  if (Object.keys(out).length === 1)
    out.keys = Object.keys(record).slice(0, 12);
  return out;
}

type Fiber = {
  tag: number;
  type: unknown;
  return: Fiber | null;
  alternate: Fiber | null;
  memoizedState: unknown;
  updateQueue: unknown;
  key: string | null;
};

const SUSPENSE = 13;

function fiberOf(element: Element): Fiber | null {
  const key = Object.keys(element).find((name) =>
    name.startsWith("__reactFiber$"),
  );
  return key
    ? ((element as unknown as Record<string, Fiber>)[key] ?? null)
    : null;
}

const nameOf = (fiber: Fiber) => {
  const type = fiber.type as
    { displayName?: string; name?: string } | string | null;
  return typeof type === "string"
    ? type
    : (type?.displayName ?? type?.name ?? `tag${fiber.tag}`);
};

// The Suspense boundaries above the skeleton, and what each is waiting on.
function suspenseReport(element: Element): unknown[] {
  const report: unknown[] = [];
  const path: string[] = [];
  for (let fiber = fiberOf(element); fiber; fiber = fiber.return) {
    path.push(nameOf(fiber));
    if (fiber.tag !== SUSPENSE) continue;
    const waits: unknown[] = [];
    for (const node of [fiber, fiber.alternate]) {
      const queue = node?.updateQueue;
      if (queue instanceof Set) for (const w of queue) waits.push(describe(w));
    }
    report.push({
      key: fiber.key,
      showingFallback: fiber.memoizedState !== null,
      waits,
      owners: path.slice(-6).join(" < "),
    });
    if (report.length >= 3) break;
  }
  return report;
}

// Turbopack marks a JS chunk loaded only when the chunk calls TURBOPACK.push
// on execution — not on the script's load event. A chunk that loads but
// never registers (stale copy, URL mismatch) leaves its import pending
// forever with nothing on the network. Track both sides.
const scriptState = new Map<string, string>();
const registered = new Set<string>();

function trackChunks(): void {
  const turbopack = (
    globalThis as { TURBOPACK?: { push: (...a: unknown[]) => unknown } }
  ).TURBOPACK;
  if (turbopack && typeof turbopack.push === "function") {
    const push = turbopack.push.bind(turbopack);
    turbopack.push = (...args: unknown[]) => {
      const current = document.currentScript as HTMLScriptElement | null;
      const first = args[0];
      const source =
        current?.src ??
        (typeof first === "string"
          ? first
          : Array.isArray(first) && typeof first[0] === "string"
            ? first[0]
            : "?");
      registered.add(short(source).split("?")[0]);
      return push(...args);
    };
  }
  const watch = (script: HTMLScriptElement) => {
    if (!script.src || script.noModule || scriptState.has(script.src)) return;
    const url = script.src;
    scriptState.set(url, "pending");
    script.addEventListener("load", () => scriptState.set(url, "loaded"), {
      once: true,
    });
    script.addEventListener(
      "error",
      () => {
        scriptState.set(url, "error");
        note(`script error ${short(url)}`);
      },
      { once: true },
    );
  };
  for (const script of document.querySelectorAll<HTMLScriptElement>(
    "script[src]",
  )) {
    // Already in the document: if it ran, it has registered or never will.
    if (!script.noModule) scriptState.set(script.src, "initial");
  }
  new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes)
        if (node instanceof HTMLScriptElement) {
          watch(node);
          note(`+script ${short(node.src)}`);
        }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

function chunkReport() {
  const unregistered: string[] = [];
  const pending: string[] = [];
  for (const [url, state] of scriptState) {
    const path = short(url).split("?")[0];
    if (!path.includes("/_next/static/chunks/")) continue;
    if (state === "pending") pending.push(path);
    else if (state === "loaded" && !registered.has(path))
      unregistered.push(path);
  }
  return { pending, unregistered, registeredCount: registered.size };
}

export function watchStuckRoutes(): void {
  trackChunks();
  (window as unknown as { stuckChunks: typeof chunkReport }).stuckChunks =
    chunkReport;
  const flights = new Set<Flight>();
  const nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const flight: Flight = {
      action: headers.has("next-action"),
      headersAt: null,
      start: performance.now(),
      url,
    };
    const rsc = headers.has("rsc") ? " rsc" : "";
    note(`fetch${flight.action ? " ACTION" : ""}${rsc} ${short(url)}`);
    flights.add(flight);
    const pending = nativeFetch.call(this, input, init);
    pending.then(
      (response) => {
        flight.headersAt = performance.now();
        note(`  ← ${response.status} ${short(url)}`);
        setTimeout(() => flights.delete(flight), 60_000);
      },
      (error: unknown) => {
        note(`  ✕ ${String(error).slice(0, 60)} ${short(url)}`);
        flights.delete(flight);
      },
    );
    return pending;
  };

  for (const method of ["pushState", "replaceState"] as const) {
    const native = history[method].bind(history);
    history[method] = (state, unused, url) => {
      note(`history.${method} ${url ? short(String(url)) : "(same url)"}`);
      native(state, unused, url);
    };
  }
  addEventListener("popstate", () => note("popstate"));
  document.addEventListener("visibilitychange", () =>
    note(`visibility ${document.visibilityState}`),
  );
  addEventListener("pageshow", (event) =>
    note(`pageshow persisted=${event.persisted}`),
  );
  addEventListener("error", (event) =>
    note(`error ${String(event.message).slice(0, 120)}`),
  );
  addEventListener("unhandledrejection", (event) =>
    note(`rejection ${String(event.reason).slice(0, 120)}`),
  );
  const nativeError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (!String(args[0]).includes("[stuck-watchdog]"))
      note(`console.error ${args.map(String).join(" ").slice(0, 160)}`);
    nativeError(...args);
  };

  let since: number | null = null;
  let shown: Element | null = null;
  let reported: Element | null = null;

  setInterval(() => {
    const skeleton = document.querySelector("[data-loading]");
    if (skeleton !== shown) {
      note(skeleton ? `skeleton on ${location.pathname}` : "skeleton gone");
      shown = skeleton;
    }
    if (!skeleton) {
      since = null;
      return;
    }
    since ??= performance.now();
    if (performance.now() - since < STUCK_MS || reported === skeleton) return;
    reported = skeleton;

    const finished = new Set(
      performance
        .getEntriesByType("resource")
        .map((entry) => (entry as PerformanceResourceTiming).name),
    );
    const flightList = [...flights];
    console.error(
      "[stuck-watchdog]",
      JSON.stringify({
        path: location.pathname + location.search,
        skeletonMs: Math.round(performance.now() - since),
        readyState: document.readyState,
        visibility: document.visibilityState,
        hydratedSkeleton: skeleton.hasAttribute("data-hydrated"),
        suspense: suspenseReport(skeleton),
        noHeaders: flightList
          .filter((flight) => flight.headersAt === null)
          .map(
            (flight) =>
              `${Math.round(performance.now() - flight.start)}ms ${short(flight.url)}`,
          ),
        unloadedStylesheets: [
          ...document.querySelectorAll<HTMLLinkElement>(
            "link[rel='stylesheet']",
          ),
        ]
          .filter((link) => !link.sheet)
          .map((link) => short(link.href)),
        unfinishedScripts: [
          ...document.querySelectorAll<HTMLScriptElement>("script[src]"),
        ]
          .filter((script) => !finished.has(script.src))
          .map((script) => short(script.src)),
        chunks: chunkReport(),
        serviceWorker: navigator.serviceWorker?.controller?.scriptURL ?? null,
        journal,
      }),
    );
  }, CHECK_MS);
}
