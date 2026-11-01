# 🎬 Guffin - Proje Dosya Yapısı (File Structure)

Bu doküman, **Guffin** projesinin mimari katmanlarını, dizin organizasyonunu ve tam dosya ağacını özetlemektedir.

---

## 📌 Proje Özeti ve Teknoloji Yığını

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React Server Components)
- **Kütüphaneler**: [React 19](https://react.dev/), [Motion](https://motion.dev/)
- **Stil & Tasarım**: [Tailwind CSS v4](https://tailwindcss.com/), PostCSS
- **Veritabanı & Backend**: [Supabase](https://supabase.com/) (SSR, PostgreSQL, Auth, RLS)
- **Veri Kaynağı**: [TMDB (The Movie Database) API](https://developer.themoviedb.org/)
- **Önbellek & Güvenlik**: [Upstash Redis](https://upstash.com/), Rate Limiting, HTTP Security Headers
- **Tip & Şema Doğrulama**: [TypeScript](https://www.typescriptlang.org/), [Zod](https://zod.dev/)

---

## 🏗️ Mimari Katmanlar

Guffin projesi, modern bir **özellik tabanlı (feature-driven)** ve **katmanlı (layered)** mimari ile yapılandırılmıştır:

1. **`src/app/`**: Next.js App Router yapısı; sayfa rotaları, hata yakalama (`error.tsx`), yükleme durumları (`loading.tsx`), route grupları ve API uç noktaları (`api/`).
2. **`src/features/`**: İş mantığı, veri sorguları, görünümler ve özelliğe özel bileşenleri barındıran modüller (ör. `account`, `movie`, `reviews`, `search`, `social`).
3. **`src/infrastructure/`**: Harici servisler (Supabase, TMDB, Upstash Redis), HTTP istemcileri ve güvenlik katmanları.
4. **`src/motion/`**: Sayfa koreografisi (`stage`), görsel efektler (`effects`), profil hero sahnesi (`scene`) ve smooth scroll motoru (`scroll`).
5. **`src/ui/`**: Proje genelinde paylaşılan atomik tasarım bileşenleri (`button`, `input`, `avatar`, `surface`, `media-card` vb.).
6. **`src/config/`**: Proje rotaları, tema tokenları ve sabit tanımlamalar.
7. **`supabase/`**: PostgreSQL veritabanı şeması ve migration dosyaları.
8. **`scripts/seed/`**: Veritabanı başlangıç verisi (seed), TMDB katalog yükleme ve test hesapları oluşturma araçları.

---

## 📂 Tam Dosya Ağacı (Full Directory Tree)

```text
guffin/
├── .env
├── .gitignore
├── DESIGN.md
├── eslint.config.mjs
├── FILE_STRUCTURE.md
├── LICENSE
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
│   └── images
│       ├── guffin-mark.svg
│       ├── Guffin.ico
│       ├── Guffin.jpeg
│       ├── Guffin.png
│       └── noise.webp
├── scripts
│   └── seed
│       ├── .cache
│       │   ├── accounts.json
│       │   ├── accounts.md
│       │   └── catalog.json
│       ├── catalog.mjs
│       ├── clean.mjs
│       ├── lib
│       │   ├── batch.mjs
│       │   ├── env.mjs
│       │   ├── people.mjs
│       │   ├── random.mjs
│       │   └── text.mjs
│       ├── load.mjs
│       ├── probe.mjs
│       ├── profile-ab.mjs
│       ├── README.md
│       └── run.mjs
├── src
│   ├── app
│   │   ├── (home)
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── account
│   │   │   ├── [username]
│   │   │   │   ├── activity
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── diary
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── likes
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── lists
│   │   │   │   │   ├── [slug]
│   │   │   │   │   │   ├── loading.tsx
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── reviews
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── watched
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── watchlist
│   │   │   │       ├── loading.tsx
│   │   │   │       └── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── api
│   │   │   ├── account
│   │   │   │   └── me
│   │   │   │       └── route.ts
│   │   │   ├── ambient
│   │   │   │   └── proxy
│   │   │   │       └── route.ts
│   │   │   ├── auth
│   │   │   │   ├── seed
│   │   │   │   │   └── route.ts
│   │   │   │   └── sessions
│   │   │   │       ├── [sessionId]
│   │   │   │       │   └── route.ts
│   │   │   │       ├── others
│   │   │   │       │   └── route.ts
│   │   │   │       └── route.ts
│   │   │   ├── backdrop
│   │   │   │   └── route.ts
│   │   │   ├── notifications
│   │   │   │   └── route.ts
│   │   │   ├── search
│   │   │   │   ├── lists
│   │   │   │   │   └── route.ts
│   │   │   │   ├── movies
│   │   │   │   │   └── route.ts
│   │   │   │   ├── people
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reviews
│   │   │   │   │   └── route.ts
│   │   │   │   └── users
│   │   │   │       └── route.ts
│   │   │   └── social
│   │   │       └── follows
│   │   │           └── route.ts
│   │   ├── apple-icon.png
│   │   ├── auth
│   │   │   └── callback
│   │   │       └── route.ts
│   │   ├── directors
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── error.tsx
│   │   ├── favicon.ico
│   │   ├── fonts
│   │   │   ├── index.ts
│   │   │   └── zuume
│   │   │       └── Zuume-Bold.woff2
│   │   ├── globals.css
│   │   ├── icon.svg
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── movie
│   │   │   └── [id]
│   │   │       ├── error.tsx
│   │   │       ├── loading.tsx
│   │   │       ├── page.tsx
│   │   │       └── reviews
│   │   │           └── page.tsx
│   │   ├── not-found.tsx
│   │   ├── oscars
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── person
│   │   │   └── [id]
│   │   │       ├── error.tsx
│   │   │       ├── loading.tsx
│   │   │       └── page.tsx
│   │   ├── privacy
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   ├── providers.tsx
│   │   ├── registry.ts
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── terms
│   │   │   ├── loading.tsx
│   │   │   └── page.tsx
│   │   └── top-100
│   │       ├── loading.tsx
│   │       └── page.tsx
│   ├── config
│   │   ├── index.ts
│   │   ├── project.ts
│   │   ├── routes.ts
│   │   └── theme
│   │       ├── ambient.ts
│   │       ├── chrome.ts
│   │       ├── context-menu.ts
│   │       ├── controls.ts
│   │       ├── dock.ts
│   │       ├── error.ts
│   │       ├── modal.ts
│   │       ├── motion.ts
│   │       ├── notification.ts
│   │       └── primitives.ts
│   ├── features
│   │   ├── account
│   │   │   ├── avatar.ts
│   │   │   ├── browse-types.ts
│   │   │   ├── browse.ts
│   │   │   ├── client.ts
│   │   │   ├── components
│   │   │   │   ├── activity-calendar.tsx
│   │   │   │   ├── activity-row.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── bio.tsx
│   │   │   │   ├── diary-chrome.tsx
│   │   │   │   ├── diary-delete-button.tsx
│   │   │   │   ├── diary-ledger.tsx
│   │   │   │   ├── dock.tsx
│   │   │   │   ├── empty-state.tsx
│   │   │   │   ├── filter-bar.tsx
│   │   │   │   ├── guard.tsx
│   │   │   │   ├── hero.tsx
│   │   │   │   ├── inbox-action.tsx
│   │   │   │   ├── link.tsx
│   │   │   │   ├── list-chrome.tsx
│   │   │   │   ├── list-comments.tsx
│   │   │   │   ├── list-owner-actions.tsx
│   │   │   │   ├── list-row.tsx
│   │   │   │   ├── pagination.tsx
│   │   │   │   ├── poster-grid.tsx
│   │   │   │   ├── poster-stack.tsx
│   │   │   │   ├── registry.tsx
│   │   │   │   ├── review-list.tsx
│   │   │   │   ├── section-tabs.tsx
│   │   │   │   ├── section.tsx
│   │   │   │   ├── shell.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── stats.tsx
│   │   │   │   └── tile-actions.tsx
│   │   │   ├── constants.ts
│   │   │   ├── dates.ts
│   │   │   ├── index.ts
│   │   │   ├── last-account.ts
│   │   │   ├── library.ts
│   │   │   ├── motion.ts
│   │   │   ├── normalize.ts
│   │   │   ├── poster.ts
│   │   │   ├── provider.tsx
│   │   │   ├── realtime.ts
│   │   │   ├── server
│   │   │   │   ├── actions.ts
│   │   │   │   ├── ambient.ts
│   │   │   │   ├── browse-actions.ts
│   │   │   │   ├── browse.ts
│   │   │   │   ├── context.ts
│   │   │   │   ├── follows.ts
│   │   │   │   ├── header.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── library-actions.ts
│   │   │   │   ├── profile.ts
│   │   │   │   └── watched-payload.ts
│   │   │   ├── skeleton.tsx
│   │   │   ├── surfaces
│   │   │   │   ├── bio.tsx
│   │   │   │   ├── notifications.tsx
│   │   │   │   ├── setup.tsx
│   │   │   │   └── social.tsx
│   │   │   ├── types.ts
│   │   │   └── views
│   │   │       ├── activity.tsx
│   │   │       ├── diary.tsx
│   │   │       ├── layout.tsx
│   │   │       ├── list.tsx
│   │   │       ├── lists.tsx
│   │   │       ├── media-collection.tsx
│   │   │       ├── overview.tsx
│   │   │       └── reviews.tsx
│   │   ├── artwork
│   │   │   ├── components
│   │   │   │   ├── picture-foresight.tsx
│   │   │   │   ├── poster-thumb.tsx
│   │   │   │   └── poster.tsx
│   │   │   ├── constants.ts
│   │   │   ├── entries.ts
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── auth
│   │   │   ├── client.ts
│   │   │   ├── components
│   │   │   │   └── listener.tsx
│   │   │   ├── constants.ts
│   │   │   ├── index.ts
│   │   │   ├── messages.ts
│   │   │   ├── provider.tsx
│   │   │   ├── server
│   │   │   │   ├── index.ts
│   │   │   │   ├── mutation.ts
│   │   │   │   ├── seed-login.ts
│   │   │   │   └── user.ts
│   │   │   ├── surfaces
│   │   │   │   ├── sign-in.tsx
│   │   │   │   └── verification.tsx
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── awards
│   │   │   ├── components
│   │   │   │   └── foil.tsx
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   └── view.tsx
│   │   ├── home
│   │   │   ├── components
│   │   │   │   ├── film-dock.tsx
│   │   │   │   ├── hero.tsx
│   │   │   │   ├── join.tsx
│   │   │   │   ├── lists.tsx
│   │   │   │   ├── members.tsx
│   │   │   │   ├── pulse.tsx
│   │   │   │   ├── reviews.tsx
│   │   │   │   ├── rising.tsx
│   │   │   │   ├── rows.tsx
│   │   │   │   └── showing.tsx
│   │   │   ├── format.ts
│   │   │   ├── index.ts
│   │   │   ├── rank.ts
│   │   │   ├── server
│   │   │   │   ├── feed.ts
│   │   │   │   └── social.ts
│   │   │   ├── skeleton.tsx
│   │   │   ├── types.ts
│   │   │   └── view.tsx
│   │   ├── legal
│   │   │   ├── components
│   │   │   │   ├── links.tsx
│   │   │   │   └── text.tsx
│   │   │   ├── constants.ts
│   │   │   ├── content.ts
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   └── view.tsx
│   │   ├── lists
│   │   │   ├── components
│   │   │   │   ├── comment-action.tsx
│   │   │   │   ├── like-button.tsx
│   │   │   │   └── popular.tsx
│   │   │   ├── index.ts
│   │   │   ├── server
│   │   │   │   ├── actions.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── popular.ts
│   │   │   ├── surfaces
│   │   │   │   ├── form.tsx
│   │   │   │   ├── order.tsx
│   │   │   │   └── picker.tsx
│   │   │   └── types.ts
│   │   ├── movie
│   │   │   ├── components
│   │   │   │   ├── artwork.tsx
│   │   │   │   ├── awards.tsx
│   │   │   │   ├── chrome.tsx
│   │   │   │   ├── collection-actions.tsx
│   │   │   │   ├── gallery-wall.tsx
│   │   │   │   ├── gallery.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── modals.tsx
│   │   │   │   ├── money-count.tsx
│   │   │   │   ├── people.tsx
│   │   │   │   ├── person-card.tsx
│   │   │   │   ├── poster-link.tsx
│   │   │   │   ├── projection.tsx
│   │   │   │   ├── recommendations.tsx
│   │   │   │   ├── reel.tsx
│   │   │   │   ├── review-card.tsx
│   │   │   │   ├── review-digest.tsx
│   │   │   │   ├── reviews.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── stats.tsx
│   │   │   │   ├── videos.tsx
│   │   │   │   └── view-switcher.tsx
│   │   │   ├── constants.ts
│   │   │   ├── index.ts
│   │   │   ├── motion.ts
│   │   │   ├── server
│   │   │   │   ├── index.ts
│   │   │   │   ├── stats.ts
│   │   │   │   └── watch-providers-actions.ts
│   │   │   ├── skeleton.tsx
│   │   │   ├── styles.ts
│   │   │   ├── surfaces
│   │   │   │   └── watch-providers.tsx
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   ├── view.tsx
│   │   │   └── watch-providers.ts
│   │   ├── person
│   │   │   ├── components
│   │   │   │   ├── artwork.tsx
│   │   │   │   ├── awards.tsx
│   │   │   │   ├── career-chart.tsx
│   │   │   │   ├── career.tsx
│   │   │   │   ├── chrome.tsx
│   │   │   │   ├── facts.tsx
│   │   │   │   ├── filmography.tsx
│   │   │   │   ├── gallery.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   ├── projection.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── timeline.tsx
│   │   │   │   ├── view-actions.tsx
│   │   │   │   ├── view-state.tsx
│   │   │   │   └── view-switcher.tsx
│   │   │   ├── constants.ts
│   │   │   ├── credits.ts
│   │   │   ├── images.ts
│   │   │   ├── index.ts
│   │   │   ├── motion.ts
│   │   │   ├── profile.ts
│   │   │   ├── skeleton.tsx
│   │   │   ├── styles.ts
│   │   │   ├── surfaces
│   │   │   │   └── bio.tsx
│   │   │   ├── types.ts
│   │   │   └── view.tsx
│   │   ├── reviews
│   │   │   ├── components
│   │   │   │   ├── movie-action.tsx
│   │   │   │   ├── rating-selector.tsx
│   │   │   │   ├── rating-stars.tsx
│   │   │   │   └── review-actions.tsx
│   │   │   ├── constants.ts
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── server
│   │   │   │   ├── actions.ts
│   │   │   │   └── queries.ts
│   │   │   ├── surfaces
│   │   │   │   └── editor.tsx
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   ├── search
│   │   │   ├── client.ts
│   │   │   ├── components
│   │   │   │   ├── action.tsx
│   │   │   │   ├── dock-command.tsx
│   │   │   │   ├── list-result-row.tsx
│   │   │   │   ├── person-result-row.tsx
│   │   │   │   ├── review-result-row.tsx
│   │   │   │   └── user-result-row.tsx
│   │   │   ├── constants.ts
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── overview.ts
│   │   │   ├── rank.ts
│   │   │   ├── server
│   │   │   │   ├── catalog.ts
│   │   │   │   ├── community.ts
│   │   │   │   ├── handler.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── media.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── settings
│   │   │   ├── components
│   │   │   │   ├── delete-panel.tsx
│   │   │   │   ├── email-form.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   ├── media-form.tsx
│   │   │   │   ├── passkeys-panel.tsx
│   │   │   │   ├── profile-form.tsx
│   │   │   │   ├── providers-panel.tsx
│   │   │   │   └── sessions-panel.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── index.ts
│   │   │   ├── session-format.ts
│   │   │   └── surface.tsx
│   │   ├── social
│   │   │   ├── components
│   │   │   │   ├── avatar-stack.tsx
│   │   │   │   ├── followed-by.tsx
│   │   │   │   └── movie-social-proof.tsx
│   │   │   ├── index.ts
│   │   │   ├── server
│   │   │   │   ├── actions.ts
│   │   │   │   └── queries.ts
│   │   │   ├── surfaces
│   │   │   │   └── proof.tsx
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── spotlights
│   │       ├── components
│   │       │   ├── dock.tsx
│   │       │   ├── winners-index.tsx
│   │       │   └── year-dial.tsx
│   │       ├── data
│   │       │   ├── best-picture.ts
│   │       │   ├── directors.ts
│   │       │   └── imdb-top-100.ts
│   │       ├── genres.ts
│   │       ├── gl
│   │       │   ├── bitmap.ts
│   │       │   ├── bloom.ts
│   │       │   ├── foundry
│   │       │   │   ├── renderer.ts
│   │       │   │   └── shader.ts
│   │       │   ├── loop.ts
│   │       │   ├── mat4.ts
│   │       │   ├── portrait
│   │       │   │   ├── renderer.ts
│   │       │   │   ├── shader.ts
│   │       │   │   ├── swarm.ts
│   │       │   │   └── swarm.worker.ts
│   │       │   └── wall
│   │       │       ├── geometry.ts
│   │       │       ├── renderer.ts
│   │       │       └── shader.ts
│   │       ├── hooks.ts
│   │       ├── index.ts
│   │       ├── opening.ts
│   │       ├── server
│   │       │   ├── cache.ts
│   │       │   ├── canon.ts
│   │       │   ├── directors.ts
│   │       │   └── laureates.ts
│   │       ├── skeleton.tsx
│   │       ├── types.ts
│   │       └── views
│   │           ├── directors.tsx
│   │           ├── oscars.tsx
│   │           └── wall.tsx
│   ├── infrastructure
│   │   ├── env.ts
│   │   ├── http
│   │   │   ├── api-error.ts
│   │   │   ├── client.ts
│   │   │   ├── pinned-fetch.ts
│   │   │   └── search-params.ts
│   │   ├── redis.ts
│   │   ├── security
│   │   │   ├── headers.ts
│   │   │   ├── rate-limiter.ts
│   │   │   └── same-origin.ts
│   │   ├── supabase
│   │   │   ├── client.ts
│   │   │   ├── database.types.ts
│   │   │   ├── proxy.ts
│   │   │   ├── server.ts
│   │   │   └── session.ts
│   │   ├── tmdb
│   │   │   ├── ambient.ts
│   │   │   ├── awards.ts
│   │   │   ├── client.ts
│   │   │   ├── constants.ts
│   │   │   ├── discover.ts
│   │   │   ├── errors.ts
│   │   │   ├── filters.ts
│   │   │   ├── images.ts
│   │   │   ├── movies.ts
│   │   │   ├── people.ts
│   │   │   ├── schemas
│   │   │   │   ├── common.ts
│   │   │   │   ├── discover.ts
│   │   │   │   ├── movie.ts
│   │   │   │   ├── person.ts
│   │   │   │   └── search.ts
│   │   │   ├── server.ts
│   │   │   ├── snapshot.ts
│   │   │   ├── transport.ts
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   └── uuid.ts
│   ├── motion
│   │   ├── effects
│   │   │   ├── crossfade-backdrop.tsx
│   │   │   ├── crt.tsx
│   │   │   ├── cursor.tsx
│   │   │   ├── foil.tsx
│   │   │   ├── grain.tsx
│   │   │   ├── house-lights.ts
│   │   │   ├── idle-screen.tsx
│   │   │   ├── index.ts
│   │   │   ├── magnet.tsx
│   │   │   ├── pointer-light.ts
│   │   │   ├── projection.tsx
│   │   │   ├── shared-image.tsx
│   │   │   └── tinted-favicon.ts
│   │   ├── gl.ts
│   │   ├── layout-flow.tsx
│   │   ├── math.ts
│   │   ├── optical-inset.ts
│   │   ├── page-handoff.tsx
│   │   ├── pointer.ts
│   │   ├── reduced-motion.ts
│   │   ├── scene
│   │   │   ├── index.ts
│   │   │   ├── scene.tsx
│   │   │   └── score.ts
│   │   ├── scroll
│   │   │   ├── engine.ts
│   │   │   ├── index.ts
│   │   │   ├── provider.tsx
│   │   │   └── steady.ts
│   │   └── stage
│   │       ├── action.tsx
│   │       ├── ambient.tsx
│   │       ├── animate.ts
│   │       ├── arrival.ts
│   │       ├── carousel.tsx
│   │       ├── choreography.ts
│   │       ├── clock.tsx
│   │       ├── color-grade.tsx
│   │       ├── cue.ts
│   │       ├── develop.tsx
│   │       ├── images-ready.ts
│   │       ├── index.ts
│   │       ├── layer.tsx
│   │       ├── lead-image.ts
│   │       ├── lines.tsx
│   │       ├── picture.tsx
│   │       ├── section.tsx
│   │       ├── sequence.tsx
│   │       ├── stage.tsx
│   │       ├── surface-scene.tsx
│   │       ├── tempo.ts
│   │       ├── text.tsx
│   │       ├── timeline.ts
│   │       ├── tone.ts
│   │       ├── view-deck.tsx
│   │       └── wall.tsx
│   ├── proxy.ts
│   └── ui
│       ├── adaptive-image.tsx
│       ├── avatar.tsx
│       ├── backdrop-hero.tsx
│       ├── button.tsx
│       ├── cn.ts
│       ├── fact-link.tsx
│       ├── highlight.tsx
│       ├── hooks
│       │   ├── use-confirm-step.ts
│       │   └── use-dock-link.ts
│       ├── icon.tsx
│       ├── index.ts
│       ├── input.tsx
│       ├── loader.tsx
│       ├── logo.tsx
│       ├── media-card.tsx
│       ├── page.ts
│       ├── result-row.tsx
│       ├── route-error.tsx
│       ├── segmented-control.tsx
│       ├── select.tsx
│       ├── skeleton.tsx
│       ├── sliding-highlight.tsx
│       ├── spinner.tsx
│       ├── sticky-aside.tsx
│       ├── surface.tsx
│       ├── switch.tsx
│       ├── textarea.tsx
│       ├── theme.ts
│       └── tooltip.tsx
├── supabase
│   └── migrations
│       ├── 20261022130000_audit_fixes.sql
│       ├── 20261022160000_account_overview.sql
│       ├── 20261022170000_account_header.sql
│       ├── 20261022180000_list_page.sql
│       ├── 20261022190000_account_activity_days.sql
│       ├── 20261026200000_no_self_list_comments.sql
│       ├── 20261027120000_film_stats.sql
│       ├── 20261027120100_seed_tools.sql
│       ├── 20261027190000_home_feed.sql
│       └── 20261031090000_guffin.sql
└── tsconfig.json
```

---

## 🔍 Temel Dizin ve Modül Açıklamaları

### 1. `src/app/` (Next.js App Router)
Next.js App Router standartlarına uygun yönlendirme ve API rotalarını içerir:
- **`(home)/`**: Ana sayfa (`page.tsx`) ve yalnızca ana sayfaya ait yükleme iskeleti (`loading.tsx`); grup, bu iskeletin diğer sayfalara sızmasını engeller.
- **`account/`**: Kullanıcı profil sayfaları:
  - `[username]/`: Kullanıcı genel bakış profili
  - `[username]/activity/`: Kullanıcının son aktiviteleri
  - `[username]/diary/`: Film günlüğü (izleme tarihleri)
  - `[username]/likes/`: Beğenilen film ve incelemeler
  - `[username]/lists/` & `[username]/lists/[slug]/`: Özel film listeleri
  - `[username]/reviews/`: Kullanıcı incelemeleri
  - `[username]/watched/`: İzlenen tüm filmler
  - `[username]/watchlist/`: İzleme listesi
- **`movie/[id]/`**: Film detay sayfası ve `reviews/` alt sayfası.
- **`person/[id]/`**: Oyuncu / yönetmen detay sayfası ve filmografisi.
- **`directors/`**: Öne çıkan yönetmenler kataloğu.
- **`top-100/`**: IMDb Top 100 poster duvarı.
- **`oscars/`**: Akademi Ödülleri özel sayfası.
- **`privacy/` & `terms/`**: Gizlilik politikası ve kullanım şartları.
- **`auth/callback/`**: Supabase kimlik doğrulama geri dönüş (OAuth callback) route handler'ı.
- **`api/`**: Sunucu tarafı API uç noktaları:
  - `account/me`: Mevcut oturum açmış kullanıcı bilgileri.
  - `auth/sessions`: Aktif kullanıcı oturumları yönetimi.
  - `auth/seed`: Geliştirme ortamında seed hesaplarıyla giriş.
  - `backdrop`: Film / kişi için backdrop görsel yolunu döner.
  - `search/`: Film (`movies`), kişi (`people`), liste (`lists`), kullanıcı (`users`) ve inceleme (`reviews`) aramaları.
  - `social/follows`: Takip etme / takipten çıkma işlemleri.
  - `notifications`: Kullanıcı bildirimleri.
  - `ambient/proxy`: TMDB görsellerini ambient renk analizi için proxy'ler (yol, base-framework tarafından sabit kullanılır).

---

### 2. `src/features/` (Özellik Modülleri)
Uygulamanın ana fonksiyonları bağımsız modüllere ayrılmıştır. Her modül aynı şablonu izler; olmayan parça atlanır:

```text
features/<ad>/
├── index.ts        # client-safe dışa açık API
├── view.tsx        # route'un render ettiği ana ekran (birden fazlaysa views/)
├── skeleton.tsx    # loading.tsx'in kullandığı iskelet
├── components/     # parçalar — dosya adında feature adı tekrarlanmaz
├── surfaces/       # modal / sheet'ler
├── server/         # server-only; dışarıya server/index.ts üzerinden açılır
└── types.ts · constants.ts · utils.ts · hooks.ts · styles.ts · motion.ts …
```

Modüller:
- **`account`**: Oturum açmış hesabın durumu ve profil sayfaları (genel bakış, günlük, koleksiyonlar, aktivite), takip ve bildirimler.
- **`artwork`**: Film ve kişi görsellerinin işlenmesi, optimizasyonu ve renk analizi.
- **`auth`**: Giriş / kayıt modal pencereleri, oturum kontrolü ve yetkilendirme akışları.
- **`awards`**: Oscar ve film ödülleri filtreleme ve listeleme mantığı.
- **`home`**: Ana sayfa akışı, vitrin bölümleri ve dinamik öneriler.
- **`legal`**: Yasal metinler ve sözleşme sayfaları içeriği.
- **`lists`**: Liste oluşturma / düzenleme / sıralama, filme liste ekleme, liste beğeni ve yorumları, bir filmin popüler listeleri.
- **`movie`**: Film detayları, oyuncu künyesi, fragmanlar ve benzer film önerileri.
- **`person`**: Biyografi, doğum/ölüm tarihleri ve kronolojik filmografi.
- **`reviews`**: Yıldız puanlaması (`rating-selector`), inceleme yazma/düzenleme (`surfaces/editor`), beğeni ve yorum aksiyonları.
- **`search`**: Birleşik hızlı arama çubuğu ve detaylı arama modalı.
- **`settings`**: Hesap ayarları paneli (profil, medya, e-posta, passkey, bağlı sağlayıcılar, oturumlar, hesap silme).
- **`social`**: Takipleşme sistemi, sosyal akış ve kullanıcı etkileşimleri.
- **`spotlights`**: Yönetmenler, Oscar'lar ve Top 100 sayfaları; WebGL çizimleri `gl/` altında.

---

### 3. `src/infrastructure/` (Altyapı & Harici Entegrasyonlar)
- **`supabase/`**:
  - `client.ts`: Tarayıcı tarafı Supabase istemcisi.
  - `server.ts`: Next.js Server Components ve Server Actions için Supabase SSR istemcisi.
  - `database.types.ts`: Veritabanı şemasının TypeScript tip tanımları.
  - `proxy.ts` & `session.ts`: Oturum doğrulama ve proxy katmanı.
- **`tmdb/`**:
  - TMDB API adaptörü; arama (`discover.ts`, `movies.ts`, `people.ts`), ödüller (`awards.ts`), filtreler, resim CDN URL'leri (`images.ts`) ve Zod şemaları (`schemas/`).
- **`redis.ts` & `security/`**:
  - Upstash Redis entegrasyonu, istek sınırlandırma (`rate-limiter.ts`), origin doğrulaması (`same-origin.ts`) ve güvenlik başlıkları (`headers.ts`).
- **`http/`**:
  - Özel HTTP istemcisi (`client.ts`), hata sınıfları (`api-error.ts`) ve URL arama parametresi işleyicileri.

---

### 4. `src/motion/` (Hareket & Sinematik Görsel Motoru)
- **`stage/`**: Sayfa koreografisi — sahne (`stage.tsx`), bölümler (`section.tsx`), zamanlama (`tempo.ts`, `choreography.ts`, `timeline.ts`, `clock.tsx`, `cue.ts`), varış dalgası (`arrival.ts`), metin animasyonları (`text.tsx`), renk derecelendirme (`color-grade.tsx`, `tone.ts`).
- **`effects/`**: Görsel efektler — projeksiyon (`projection.tsx`), film greni (`grain.tsx`), özel imleç (`cursor.tsx`), CRT geçişi (`crt.tsx`), boşta ekranı (`idle-screen.tsx`), sayfalar arası görsel taşıma (`shared-image.tsx`), salon ışıkları durumu (`house-lights.ts`).
- **`scene/`**: Profil hero sahnesi (`scene.tsx`) ve zamanlama partisyonu (`score.ts`).
- **`scroll/`**: Smooth scroll motoru (`engine.ts`, `steady.ts`, `provider.tsx`).
- Kök: `layout-flow.tsx` (layout kaymalarını yumuşatır), `page-handoff.tsx` (film sayfalarına geçiş), `gl.ts` (WebGL yardımcıları), `pointer.ts`, `reduced-motion.ts`, `optical-inset.ts`, `math.ts`.

---

### 5. `src/ui/` (Tasarım Sistemi & Temel Bileşenler)
- **Form Elemanları**: `button.tsx`, `input.tsx`, `select.tsx`, `switch.tsx`, `textarea.tsx`, `segmented-control.tsx`.
- **Medya & Sunum**: `adaptive-image.tsx`, `backdrop-hero.tsx`, `media-card.tsx`, `avatar.tsx`, `logo.tsx`.
- **Geri Bildirim & Durum**: `loader.tsx`, `spinner.tsx`, `skeleton.tsx`, `route-error.tsx`, `tooltip.tsx`.
- **Yardımcılar**: `cn.ts` (Tailwind class merging), `theme.ts`, `page.ts` (sayfa düzeni sınıfları), `highlight.tsx`, `sticky-aside.tsx`.
- **Hook'lar**: `hooks/use-confirm-step.ts`, `hooks/use-dock-link.ts`.

`src/config/theme/` her framework modülü için tek dosya tutar (`dock.ts`, `modal.ts` …); bileşenin hem görünüm hem hareket tokenları aynı dosyadadır, ortak hareket ölçeği `motion.ts`'tedir.

---

### 6. `supabase/migrations/` (Veritabanı Şemaları)
PostgreSQL üzerinde çalışan migration dosyaları:
- Kullanıcı hesapları ve profil tabloları
- Film istatistikleri ve aktivite günlüğü
- Liste, yorum ve beğeni yapıları (RLS güvenlik politikaları ile)
- Ana sayfa akışı (home feed) görünüm ve fonksiyonları

---

### 7. `scripts/seed/` (Veri Hazırlama & Tohumlama Araçları)
- `catalog.mjs`: TMDB API üzerinden filmleri çekip yerel önbelleğe (`.cache/catalog.json`) kaydeder.
- `run.mjs` & `load.mjs`: Önbellekteki film kataloğunu ve örnek kullanıcı hesaplarını Supabase veritabanına aktarır.
- `clean.mjs`: Veritabanındaki test verilerini temizler.
- `probe.mjs` & `profile-ab.mjs`: Veri profilleme ve test araçları.
