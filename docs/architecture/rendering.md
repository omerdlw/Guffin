# Rendering a page

What happens between typing `/movie/603` and seeing the film's hero fade in.
The movie page is the example; person and profile pages follow the same
shape.

## The request, end to end

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant P as CDN
  participant R as RSC (app/movie/[id])
  participant T as TMDB (fetch cache)
  participant D as Postgres
  participant C as Client runtime

  B->>P: GET /movie/603
  P->>R: GET /movie/603
  R-->>B: loading.tsx → MovieSkeleton (streamed first)
  par one Promise.all
    R->>T: getMovieDetails(603)
    R->>T: getMovieImages(603)
    R->>D: getFilmStats(603) via viewer session
  and as soon as details resolve
    R->>R: getAmbientPalette(backdrop or poster)
  end
  R-->>B: streamed RSC payload (chrome + view)
  Note over R,B: awards and popular lists stay promises,<br/>streamed into their own Suspense slots
  B->>C: hydrate
  C->>D: getMovieLibraryAction (server action, viewer's own marks)
  C->>C: stage sets data-play after two painted frames
  C->>C: IntersectionObserver sets data-seen as roles scroll in
```

Some choices that shape this:

- **The page is the same for everyone.** The server part of `/movie/[id]`
  reads only public data: TMDB plus aggregate `film_stats`. The viewer's
  own state (watched? on the watchlist? rated?) is fetched after hydration
  by `MovieCollectionActions` through `getMovieLibraryAction`. Personal state
  never blocks the first paint.
- **The CSP is static.** It is set in `next.config.mjs`; a per-request
  nonce would force a server render on every hit and rule out CDN caching.
- **Slow parts are passed down as promises.** `getMovieAwards` and
  `getMoviePopularLists` start in the page and resolve inside their own
  Suspense boundaries, so the hero does not wait for them.
- **Request-level dedupe.** TMDB getters are wrapped in React `cache()`, so
  `generateMetadata` and the page share one `getMovieDetails` call per
  request. Across requests, Next's fetch cache holds the response (see
  [catalog](catalog.md)).
- **Missing vs broken.** A TMDB `not_found` becomes `notFound()` (404). Any
  other failure throws, and `error.tsx` renders.

## Where the page's colour comes from

Every detail page is tinted by its own artwork. The server picks one image,
extracts a palette, and the client turns it into CSS variables.

```mermaid
flowchart LR
  art["backdrop (or poster)<br/>movieSwatch()"] --> pal["getAmbientPalette()<br/>framework ambient/server<br/>unstable_cache per version"]
  pal --> chrome["MoviePageChrome<br/>palette prop"]
  chrome --> vars["--ambient-page · --ambient-vibrant<br/>--ambient-top/right/left/bottom<br/>--ambient-presence"]
  vars --> page["--page (paper, L≈0.955)"]
  vars --> grade["--grade (accent, ≥ 4.5:1 on page)"]
  vars --> wash["room wash (glow opacity = presence)"]
```

The palette is computed once per image and analysis version, then cached.
`--grade` is the picture's most vivid colour mixed into ink by how colourful
the picture is, so a grey film gets a quiet accent and a neon one a loud
accent. The colour system is described in `docs/design/03-colour.md`.

## Motion: compiled to CSS, triggered by attributes

Motion is part of the product, but very little of it runs as JavaScript. A
page declares its choreography in its own `motion.tsx` with `defineStage`.
The stage compiles it into **one stylesheet** scoped to `[data-choreo=…]`.
React 19 hoists that stylesheet into the server-rendered `<head>`. JavaScript
only flips attributes.

```mermaid
flowchart TB
  subgraph Build["At render"]
    def["motion.tsx<br/>defineStage({ parts, sections, motion })"] --> css["choreo.ts → one scoped stylesheet<br/>keyframes paused on frame 0"]
    css --> head["&lt;style href precedence&gt;<br/>hoisted into SSR head"]
    comp["Shared components<br/>declare roles only:<br/>data-part · data-section · data-kind"]
  end

  subgraph Runtime["In the browser (stage.tsx)"]
    hyd["hydrated + 2 painted frames<br/>no curtain down"] -->|data-play on root| load["on: 'load' entrances run"]
    io["one IntersectionObserver<br/>role 16% into view"] -->|data-seen| view["on: 'view' entrances run"]
    img["backdrop image loaded<br/>(2.5s fallback)"] -->|data-ready| ready["on: 'ready' entrances run"]
  end

  head --> load
  head --> view
  head --> ready
  comp --> io
```

- **Roles vs choreography.** Shared components (`MediaCard`, headings,
  carousels) never animate themselves. They state what they are
  (`data-part="poster"`, `data-kind="media"`), and each page decides how that
  role moves. The same card can drift in on the home page and stay still in
  search.
- **Curtains.** An element with `data-curtain` holds `data-play` back (up to
  12s). The detail marquee uses one: the page starts when its dive fades.
- **Opening hold.** Roles already in view on arrival wait `opening` seconds,
  so the first screen plays top-down instead of all at once.
- **One-shot.** A role plays the first time it is seen and never replays.
- **Timing** uses the golden ratio: `beat(n) = φⁿ` seconds (0.236, 0.382,
  0.618, 1, 1.618…), stretched per stage by `tempo` and `reach`.

## The layers on screen

```mermaid
flowchart TB
  html["&lt;html&gt; · body bg-page"] --> providers["Providers (client)<br/>Core · Theme · Ui · Tooltip · Auth · Account · Engine"]
  providers --> modules["framework modules<br/>dock · modal · context menu · toast · ambient · navigation"]
  providers --> glass["GlassEngine<br/>one SVG lens filter per liquid control"]
  providers --> cursor["Cursor · LiquidTouch · NoTab"]
  providers --> stage["Page stage (StageRoot)<br/>grade + choreography scope"]
  stage --> hero["hero: backdrop canvas / WebGL projection"]
  stage --> sections["sections: data-section, entered on view"]
  modules --> surfaces["dock surfaces (lazy chunks)<br/>review editor, watch date, sign-in …"]
```

`@omerdlw/base-framework` supplies the dock, modal, surface and navigation
behaviour with **no design of its own**. Guffin passes in every class, colour,
duration, z-index and icon (`src/design/theme`). Dock surfaces such as the
review editor are lazy chunks (`lazySurface`), preloaded when the control
that opens them mounts.
