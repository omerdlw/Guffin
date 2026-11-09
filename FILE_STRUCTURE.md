# Guffin: dosya yapısı

`src/` 508 dosya ve 119 dizinden **237 dosya ve 65 dizine** indirildi (her özellikte sabit `types` · `constants` · `utils` üçlüsü dahil). Dizinlerin çoğu Next.js'in zorunlu kıldığı rota klasörleridir (`app/`); geri kalanı 5 katman ve 15 özellik klasöründen ibarettir.

## Teknoloji

Next.js (App Router, Turbopack), React 19, Motion, Tailwind CSS v4, Supabase (SSR, Auth, RLS), TMDB API, Upstash Redis, TypeScript, Zod.

## Katmanlar

```text
app  →  features  →  ui ⇄ motion  →  lib
```

Bağımlılık soldan sağa akar; `ui` ve `motion` kardeştir (`motion` `cn` ve `Logo`'yu, `ui` motorun partisyonlarını kullanır). `lib` hiçbirine bağlanmaz. `ui`, `motion` ve `lib`'in `features`'a ya da `app`'e, `features`'ın `app`'e bağlanması ESLint ile (`no-restricted-imports`) yasaktır:

| Katman      | Ne içerir                                                                             | Neye bağlanabilir                       |
| ----------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| `app/`      | Rotalar (`page`, `layout`, `loading`, `error`, `route`), kök sağlayıcılar, tema ayarı | Her şey                                 |
| `features/` | Ürün alanları: film, kişi, profil, arama, listeler…                                   | `ui`, `motion`, `lib`, diğer özellikler |
| `ui/`       | Tasarım sistemi: buton, form, medya, yüzey, iskelet, sınıf tokenları                  | `motion`, `lib`                         |
| `motion/`   | Tek hareket motoru ve görsel efektler                                                 | `ui`, `lib`                             |
| `lib/`      | Yapılandırma, TMDB, Supabase, HTTP, güvenlik; React ya da arayüz bilmez               | yalnızca dışarısı                       |

`@/` takma adı `src/` dizinine gider. Aynı klasördeki dosyalar birbirini `./x` ile, klasör dışındakiler `@/klasör/x` ile içe aktarır. Barrel (`index.ts`) yoktur: bir şeyi tanımlandığı dosyadan içe aktarırsınız.

## Özellik klasörü kuralları

Her özellik **düz** bir klasördür (`components/`, `server/`, `views/` gibi alt klasör yok). Kökünde aynı üç dosya bulunur; geri kalan dosyalar rolüyle adlandırılır. Olmayan rol için dosya açılmaz.

| Dosya          | Rol                                                                                                       | Sınıf         |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------- |
| `types.ts`     | Özelliğin bütün `type` ve `interface` tanımları. Başka hiçbir dosyada tip tanımlanmaz                     | nötr          |
| `constants.ts` | Özelliğin bütün sabitleri. WebGL shader kaynakları hariç: onlar kullanıldıkları `gl*.ts` dosyasında kalır | nötr          |
| `utils.ts`     | Yardımcı, yedek ve akışı bölen fonksiyonlar: bir dosyanın asıl işi olmayan her fonksiyon                  | nötr          |
| `server.ts`    | Veri okuma (Supabase, TMDB, Redis). `import "server-only"`                                                | yalnız sunucu |
| `actions.ts`   | Sunucu aksiyonları (`"use server"`), yalnızca async fonksiyon dışa aktarır                                | aksiyon       |
| `view.tsx`     | Rotanın render ettiği sunucu bileşeni                                                                     | sunucu / nötr |
| `skeleton.tsx` | `loading.tsx`'in kullandığı iskelet                                                                       | nötr          |
| `motion.tsx`   | Sayfanın hareket partisyonu (score)                                                                       | istemci       |
| `<konu>.tsx`   | İstemci bileşenleri, konuya göre gruplu (`reviews.tsx`, `cast.tsx`, `form.tsx`…)                          | istemci       |

Fonksiyon yerleşimi:

- Bir fonksiyon, bulunduğu dosyanın temel sorumluluğunun parçasıysa o dosyada kalır: bileşen ve hook, sunucu aksiyonu, veri okuyan/yazan fonksiyon, modül durumunu tutan fonksiyon, bir `credits.ts` gibi alan mantığı dosyasının dışa açtığı API.
- Geri kalan her şey `utils.ts`'e gider: biçimlendirici, ayrıştırıcı, karşılaştırıcı, normalleştirici, sınıf üretici, matematik yardımcısı.
- Bir tipe ya da sabite ihtiyaç duyan her dosya onu `./types` ve `./constants` üzerinden alır; yerel `type`, `interface` ya da sabit tanımlanmaz.

Sınıflar karıştırılmaz: `"use client"` dosyasına sunucu verisi, `"use server"` dosyasına sabit/yardımcı konmaz. `types.ts`, `constants.ts` ve `utils.ts` **nötr**dür; bu yüzden `server-only` içe aktarmaz, hook kullanmaz ve `"use client"` modüllerinden (`ui/surface.tsx`, `ui/media.tsx`…) değer okumaz (sunucuda o değerler istemci referansıdır). Sınıf tokenları bu yüzden `ui/tokens.ts`'tedir. Sunucuya bağlı yardımcılar (Supabase istemcisi alan okuma fonksiyonları gibi) `utils.ts`'e gidemez; `server.ts`/`actions.ts` içinde kalır.

Bağımlılık yönü: `types` ← `constants` ← `utils`. `types.ts` yalnızca `import type` ile `constants.ts`'e bakar (`typeof SABİT` için); `constants.ts` yalnızca `legal`'de `utils.ts`'ten değer alır. Çekirdek dosyalar bu üçünü içe aktarır, tersi olmaz.

Tek dosyalık özellik bile aynı kuralı izler: `features/artwork/artwork.tsx` + üçlü. `motion/` da aynı düzendedir: kökünde `types.ts`, `constants.ts`, `utils.ts`; `.ts` modüllerin dışa açtığı API (`createEngine`, `defineScore`, `mountScene`…) yerinde kalır, bileşen dosyalarındaki yardımcılar `utils.ts`'e gider.

## Ağaç

```text
guffin/
├── DESIGN.md                    Tasarım ve hareket sözleşmesi
├── FILE_STRUCTURE.md            Bu dosya
├── docs/
│   ├── motion-engine.md         Motor mimarisi ve kanunları
│   └── motion-analysis.md       Motor öncesi analiz (tarihsel)
├── eslint.config.mjs · next.config.mjs · postcss.config.mjs · tsconfig.json
├── public/                      grain.png, images/
├── scripts/seed/                (yerel, git dışı) TMDB kataloğu ve test hesapları
├── supabase/migrations/         (yerel, git dışı) PostgreSQL şeması
└── src/
    ├── proxy.ts                 Next proxy: oturum yenileme + güvenlik başlıkları
    │
    ├── app/                     ── Rotalar
    │   ├── layout.tsx           Kök layout, fontlar, metadata
    │   ├── providers.tsx        Kök sağlayıcılar + dock kaydı
    │   ├── theme.ts             Çerçeve modüllerinin tema ayarı (dock, modal, menü…)
    │   ├── globals.css          Tokenlar ve sınıf tarifleri
    │   ├── zuume-bold.woff2 · icon.svg · favicon.ico · apple-icon.png
    │   ├── error.tsx · loading.tsx · not-found.tsx · robots.ts · sitemap.ts
    │   ├── (home)/              /
    │   ├── account/             /account (giriş) ve /account/[username]/…
    │   │                        activity · diary · likes · lists[/slug] · reviews · watched · watchlist
    │   ├── movie/[id]/          film, reviews/
    │   ├── person/[id]/
    │   ├── oscars/ · top-100/ · directors/ · privacy/ · terms/
    │   ├── auth/callback/       OAuth dönüşü
    │   ├── lab/                 Yalnızca geliştirme: /lab/engine, /lab/engine/b, /lab/kit
    │   └── api/                 account/me · ambient/proxy · auth/{seed,sessions} · backdrop
    │                            notifications · search/[kind] · social/follows
    │
    ├── features/                ── Ürün alanları (her birinde types · constants · utils)
    │   ├── artwork/             artwork: kullanıcının seçtiği afiş/arka plan (depo, bağlam menüsü, bileşenler)
    │   ├── auth/                client · provider · server · sign-in · verification · notice
    │   ├── account/             Oturum açmış kullanıcı: client · provider (+ guard, realtime)
    │   │                        actions · server · notifications · social · setup · tiles
    │   ├── profile/             /account/[username] sayfaları: server · view · motion · skeleton
    │   │                        overview · hero · shell · controls · filter-bar · blocks · diary
    │   │                        activity · calendar · reviews · lists
    │   ├── settings/            Ayarlar yüzeyi: surface · shared · identity · security
    │   │                        passkeys · providers · sessions
    │   ├── detail/              Film ve kişi sayfasının ortak iskeleti (ödüller dahil):
    │   │                        layout · stage · gallery · awards · motion
    │   ├── movie/               actions · server · view · skeleton · reviews · cast · media · gallery
    │   │                        views · collection · stage · watch-providers
    │   ├── person/              credits · view · views · skeleton · header · career · sections
    │   ├── home/                server · view · skeleton · motion · hero · community
    │   ├── search/              hooks · server · action · results
    │   ├── lists/               actions · server · popular · buttons · form · order · picker
    │   ├── reviews/             actions · server · rating · controls · editor · movie-action
    │   ├── social/              actions · proof
    │   ├── legal/               view (metinler `constants.ts`'te)
    │   └── spotlights/          Oscar, yönetmenler, Top 100:
    │                            shell · server · motion · oscars · directors · top-100
    │                            gl · gl-foundry · gl-wall
    │
    ├── ui/                      ── Tasarım sistemi
    │   ├── tokens.ts            Sayfa ritmi, TONE, RADIUS, cam/yüzey ve dock yüzeyi sınıfları (nötr)
    │   ├── cn.ts                Token'ları bilen sınıf birleştirici
    │   ├── theme.ts             Çerçeve tema slotları (primitives)
    │   ├── button.tsx           Button, ActionButton, DockAction, FactLink, AccountLink, kancalar
    │   ├── form.tsx             Input, Textarea, Switch, Select, SegmentedControl, vurgu grupları
    │   ├── media.tsx            Icon, Logo, AdaptiveImage, Avatar, MediaCard, Carousel
    │   ├── feedback.tsx         Loader, Spinner, RouteError, Tooltip
    │   ├── surface.tsx          SurfaceStage, SurfacePart, Unfold (sınıflar `tokens.ts`'te)
    │   └── skeleton.tsx         İskelet blokları
    │
    ├── motion/                  ── Hareket motoru (ayrıntı: docs/motion-engine.md)
    │   ├── types.ts · constants.ts · utils.ts    Motorun bütün tipleri, sabitleri ve yardımcıları (`step`, `clamp`, `bezier`, `springAt`…)
    │   ├── time.ts              Madde tablosu, fiiller (`arrival`, `departure`, `response`), eğri/yay tabloları, çerçeve `motion` ayarı
    │   ├── engine.ts            Saat, Signal, Value, duyular
    │   ├── forces.ts            Kuvvet alanları ve dokunuş
    │   ├── color.ts             Görünüm cebiri, oda rengi, CSS değişkenleri
    │   ├── score.ts · stage.ts  Partisyon ve çalışma zamanı
    │   ├── scroll.ts · carry.ts Scroll sürücüsü, sayfalar arası devir
    │   ├── render.ts            Canvas/WebGL sahnesi, GL yardımcıları, metin bölme
    │   ├── react.tsx            EngineProvider, bindScore, kancalar
    │   ├── kit.tsx · marquee.tsx · expose.tsx · wall.tsx    Kit bileşenleri
    │   └── projection.tsx · cursor.tsx · tilt.tsx · screen.tsx · transitions.tsx    Efektler
    │
    └── lib/                     ── Altyapı
        ├── env.ts               Ortam değişkenleri, oturum çerezi sabitleri
        ├── project.ts           Site bilgisi, paylaşım metadata'sı, rota yardımcıları (`movieHref`…)
        ├── http.ts              İstemci `requestJson`, `readParam`, `isUuid`
        ├── format.ts            `pluralize`, `toLogline`
        ├── security.ts          Redis, hız sınırı, güvenlik başlıkları, aynı kaynak, güvenli fetch, API hata yanıtı
        ├── supabase/            browser · server (+ proxy) · database.types
        └── tmdb/                api · schemas · awards · server · shared
```

## Nereye ne konur

- **Yeni sayfa:** `app/<rota>/page.tsx` ince kalır (metadata + `view` çağrısı). Gövdesi ilgili özelliğin `view.tsx`'ine, iskeleti `skeleton.tsx`'e, hareketi `motion.tsx`'e gider.
- **Yeni özellik:** `features/<ad>/` aç; `types.ts`, `constants.ts`, `utils.ts` üçlüsünü (içeriği olanları) ve gereken rol dosyalarını ekle.
- **Yeni tip, sabit ya da yardımcı:** dosyanın içine değil, özelliğin `types.ts` / `constants.ts` / `utils.ts` dosyasına yaz. Dosyada yalnızca o dosyanın asıl işi kalır.
- **İki özelliğin ortak ihtiyacı:** önce ilgisiz bir özellik değil `ui/` (görsel) ya da `lib/` (mantık) olup olmadığına bak. Film ve kişi sayfalarının ortak parçaları `features/detail`'dedir.
- **Yeni UI parçası:** `ui/` içindeki konuya uyan dosyaya ekle (`form.tsx`, `media.tsx`…); yeni dosya yalnızca yeni bir konu doğarsa.
- **Rota dosyaları** (`page`, `layout`, `loading`, `error`, `route`) Next.js'in kuralıdır; birleştirilemez. `app/api/search/[kind]` beş arama uç noktasını tek rotada toplar.
- **Veritabanı değişikliği:** `supabase/migrations/` altına yeni bir migration; tipler `lib/supabase/database.types.ts`'e yeniden üretilir.
