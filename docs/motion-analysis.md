# Guffin Motion Analizi

> Tarih: 2 Kasım 2026 · Kapsam: `src/motion/**` (~8.600 satır), sayfa başına
> koreografi dosyaları, `globals.css` motion kuralları, WebGL spotlight
> renderer'ları. Amaç: mevcut sistemi haritalamak, sayfaları tek tek okumak ve
> motion'ın `DESIGN.md`'ye nasıl gireceğine karar vermek için zemin hazırlamak.

---

## 0. Kısa özet

1. **Ortada tek bir motion sistemi yok, bir aile var.** Çekirdek `src/motion/stage`
   (gramer: `GRAMMAR`, motor: `Stage`) ana sayfa, film, kişi ve üç spotlight
   sayfasını yönetiyor. Hesap sayfaları ise **paralel, ayrı bir motor**
   (`src/motion/scene`, `Score`) kullanıyor. Yasal sayfalarda motion **hiç yok**.
2. **Zaman ölçeği iyi kurulmuş ama her yerde geçerli değil.** `size(n) = 0.5s × φⁿ`
   katmanlarda (dock, modal, menü), `Stage` sayfalarında ve CSS'te tutarlı.
   Hesap sayfaları farklı bir ölçek (`beat`/`span`), WebGL sahneleri ise ham
   saniyeler (`1.6`, `2.4`, `4.6` …) kullanıyor.
3. **Scroll ilişkileri gramerin dışında kalmış.** Parallax, kararma ve kayma
   değerleri (`900 → 240px`, `720 → 0.2`, `-36px`, `-56px`) bileşenlerin içine
   gömülü ve iki motorda kopyalanmış.
4. **Spotlight sayfalarında çıkış "donma" gibi görünüyor.** Navigasyon 1.03 sn
   bekletiliyor ama ekranda hiçbir şey sönmüyor (B7).
5. **Scroll hissi sayfadan sayfaya değişiyor.** `Stage` motoru ayarlıyor
   (`response 0.16`, `wheel 0.8`), `Scene` ve yasal sayfalar ayarlamıyor
   (`0.11`, `1`). Kullanıcı hesap sayfasına geçince tekerleğin ağırlığı değişiyor.
6. **Cevap: sayfalar aynı animasyonu oynamamalı, aynı dili konuşmalı.** Önerim
   üç sayfa türü (Film, Salon, Defter), türler arasında sabit kalan bir
   "değişmezler" listesi ve her sayfanın kendi `motion.ts` partisyonu. Ayrıntısı
   bölüm 5 ve 6'da.

---

## 1. Mimari harita

Sistem altı katmandan oluşuyor. Alttaki katman üsttekini bilmiyor; üstteki
alttakini çağırıyor.

```
┌──────────────────────────────────────────────────────────────────────┐
│ 6  Sayfa partisyonları    features/*/motion.ts  (SCENE = GRAMMAR + …) │
├──────────────────────────────────────────────────────────────────────┤
│ 5  Efektler               Projection, Ambient/Room, Grain, Carry,     │
│                           Intermission, Cursor, Flowing, Foil, Tube   │
├──────────────────────────────────────────────────────────────────────┤
│ 4  Primitifler            Backdrop, Body, Sequence, Title, Words,     │
│                           Expose, Count, Fade, Line, Layer, Section,  │
│                           Header, Cascade, Item, Swap, Carousel, Tile │
├──────────────────────────────────────────────────────────────────────┤
│ 3  Sahne motoru           Stage: Timeline, Pace, Exit, Grade, Wall    │
│    (paralel)              Scene: Score, Reveal, Leaving   ← yalnız hesap│
├──────────────────────────────────────────────────────────────────────┤
│ 2  Gramer                 GRAMMAR (choreography.ts)                   │
├──────────────────────────────────────────────────────────────────────┤
│ 1  Tempo                  size(), EASE, SPRING, ARRIVE (tempo.ts)     │
│                           + CSS @theme --duration-* / --ease-*        │
├──────────────────────────────────────────────────────────────────────┤
│ 0  Scroll motoru          SmoothScroll (scroll/engine.ts)             │
└──────────────────────────────────────────────────────────────────────┘
   Ayrık: WebGL sahneleri (Foundry, Portrait, Wall) · CSS keyframe'leri
```

### 1.0 Scroll motoru — `src/motion/scroll/engine.ts`

- Tekerlek olayını yakalayıp (`preventDefault`) kendi hedefine yazar. Kritik
  sönümlü bir yay (`glide`) ile `window.scrollTo` çağırır. Sonuç `scrollY` adlı
  bir `MotionValue`'dur ve scroll'a bağlı her şey bunu okur (`useScrollY`).
- Doğal scroll'a saygı gösterir: içeride kayan bir alan, `data-scroll-native`,
  kilitli sayfa (`overflow: hidden`), yatay jest, `shift`, `ctrl/meta` ve
  `prefers-reduced-motion`.
- Kayarken `<html data-scrolling>` ekler ve sinematik sayfalarda pointer
  olaylarını yutan görünmez bir **kalkan** (`z-index: 90`) açar. Kayarken hover
  ışıkları yanmaz.
- `tune()` ile sayfa başına ayarlanabilir. Bugün tek çağıran `Stage`.
- `stopAt()` ile scroll'u bir noktada "tutan" duraklar, ayrıca jest analizi
  (`steady`, `held`, `dwell`, `rises`) var. **Bu mekanizmayı bugün hiçbir sayfa
  kullanmıyor** (bkz. B6).

### 1.1 Tempo — `src/motion/stage/tempo.ts` + `globals.css @theme`

| Ad       | n   | sn    | Nerede                                    |
| -------- | --- | ----- | ----------------------------------------- |
| `ripple` | -6  | 0.03  | Çok işaretli stagger (kadran)             |
| `flick`  | -4  | 0.075 | Kardeşler arası stagger                   |
| `touch`  | -3  | 0.12  | Basma                                     |
| `leave`  | -2  | 0.19  | Kapanış; section içi item aralığı         |
| `light`  | -1  | 0.31  | Küçük ışık; section'lar arası min. aralık |
| `reveal` | 0   | 0.5   | Hover; görüntü bekleme sabrı              |
| `move`   | 1   | 0.81  | Geri dönüş; header'dan içeriğe gecikme    |
| `settle` | 2   | 1.31  | Hover sönüşü; item varışı (ışık)          |
| `linger` | 3   | 2.12  | Başlık kelimeleri; header süpürmesi       |
| —        | 4   | 3.43  | Backdrop açılışı, Picture açılışı         |
| —        | 1.5 | 1.03  | Sayfa çıkışı (bekleme ve koşu)            |

Ek yardımcılar: `hand(n) = size(n-2)`, `landed(n) = size(n) × 0.6` ("göz için
yerine oturdu" anı), `spread()` (pencereye sığan stagger), `settle()`
(yavaşlayan stagger, `bend` üssüyle).

`EASE` (JS) ile CSS eğrileri arasında eşleşme:

| JS `EASE` | CSS            | Durum                                         |
| --------- | -------------- | --------------------------------------------- |
| `cream`   | `out-cream`    | ✓                                             |
| `expo`    | `out-expo`     | ✓                                             |
| `silk`    | `out-quint`    | ✓ (aynı eğri, farklı ad)                      |
| `glide`   | `in-out-cubic` | ✓ (aynı eğri, farklı ad)                      |
| `fade`    | `fade`         | ✓                                             |
| `pour`    | —              | **Yalnız JS.** En çok kullanılan varış eğrisi |
| `dolly`   | —              | **Yalnız JS.** Header süpürmesi, Trace        |
| —         | `phosphor`     | Yalnız CSS (hover sönüşü)                     |
| —         | `out-quart`    | Yalnız CSS (varsayılan transition)            |
| —         | `in-cubic`     | Yalnız CSS                                    |

`DESIGN.md §3.6` tablosunda `pour` ve `dolly` hiç geçmiyor.

### 1.2 Gramer — `src/motion/stage/choreography.ts`

`GRAMMAR` sahnenin "fiillerini" topluyor: `backdrop`, `title`, `facts`,
`count`, `section` (sweep, stride, patience), `items`, `slides`, `swap`, `view`,
`scrub` (defocus, push), `scroll` (motor ayarı), `exit`, `layers` (scroll'la
kararma), `film` (pace, cut, house lights, intermission), `wall`.

Sayfa partisyonları bunu genişletiyor: `features/movie/motion.ts`,
`features/person/motion.ts`, `features/spotlights/opening.ts`. Hesabın
`features/account/motion.ts` dosyası ise `GRAMMAR`'ı değil `Score` tipini
dolduruyor (bkz. B1).

### 1.3 Sahne motoru — `Stage` (`src/motion/stage/stage.tsx`)

Bir sayfayı "film gösterimi" gibi yöneten yedi mekanizma:

| Mekanizma    | Ne yapar                                                                                                                                                                                                                                                | Dosya                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Timeline** | Section'ları sıraya sokar: görüntüdekiler yukarıdan aşağı, en az `stride` arayla, görselleri yüklenince (en fazla `patience` beklenir) açılır. `picture` sayfalarında backdrop hazır olana kadar (en fazla 2.5 sn) her şey bekler.                      | `timeline.ts`, `cue.ts`           |
| **Opening**  | Sayfanın açılış partisyonu: `base` (başlık anı), `end`, `length`. `Sequence` saatini bununla çalıştırır.                                                                                                                                                | `choreography.ts`, `sequence.tsx` |
| **Pace**     | Oturumun ilk sayfası 1×; içeriden gelinen yeni sayfa √φ ≈ 1.27× hızlı; daha önce görülen sayfa φ ≈ 1.62× hızlı oynar (`sessionStorage`).                                                                                                                | `stage.tsx` `usePace`             |
| **Exit**     | Navigasyonu `useNavigationHold` ile `exit.wait` (1.03 sn) bekletir; bir "çıkış saati" yayınlar. Başlık, kelimeler, olgular, gövde ve backdrop bu saate göre söner. Geri tuşu dışındaki geçişlerde poster bir sonraki sayfaya **taşınır** (`liftCarry`). | `stage.tsx`, `clock.tsx`          |
| **Grade**    | Görselden renk okur (48 px canvas), `--grade` değişkenini `film.cut` (1.31 sn) içinde yumuşakça geçirir; favicon'u da boyar; bir sonraki sayfaya payload olarak taşınır.                                                                                | `color-grade.tsx`, `tone.ts`      |
| **Wall**     | Galeri duvarı: `page → leaving → wall → closing → returning`. Sayfayı yukarı sarar, söndürür, duvarı asar; kapanınca çağıran section'a geri döner.                                                                                                      | `wall.tsx`                        |
| **Frame**    | Sabit katmanlar: grade yıkaması, film greni, cam vinyet, "salon ışıkları" (video açıkken %80 karartma).                                                                                                                                                 | `color-grade.tsx`                 |

### 1.4 Primitifler

| Grup             | Bileşenler                                                      | Davranış                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sahne iskeleti   | `Backdrop`, `Body`, `Ambient`, `Picture`                        | Backdrop: 1.45× → 1, blur 18 → 0, parlaklık 0.25 → 1 (3.43 sn). Scroll'da aşağı kayar, kararır, yaklaşır.                                                                                        |
| Başlık bloğu     | `Sequence`, `Title`, `Hairline`, `Words`, `Layer`               | Kelimeler alttan %108 yükselir; tagline/overview satır satır, bulanıklıktan çıkar; `Layer` scroll'da 0.2'ye kararır.                                                                             |
| Olgular          | `Expose`, `Fade`, `Line`, `Count`                               | `Expose`: metin soldan sağa bir ışık bandıyla "pozlanır", çıkışta aynı bantla "yanar"; hover'da parıltı tekrarlanır. `Count` sayar.                                                              |
| Section'lar      | `Section`, `Header`, `Cascade`, `Item`, `Beat`, `Swap`, `Trace` | Header'da bir "kafa" soldan sağa süpürür (dolly, 2.12 sn): ikon yanar → başlık pozlanır → çizgi çekilir → aksiyonlar silinerek açılır. İçerik 0.81 sn sonra okuma sırasıyla dalga halinde gelir. |
| Görüntüler       | `Carousel`, `Tile`, `Develop`                                   | `Develop`: kapı aşağıdan kayar, resim yukarıdan iner ve 1.14× → 1 yaklaşır (perde efekti).                                                                                                       |
| Görünüm değişimi | `ViewDeck`                                                      | Eski görünüm bulanıklaşıp kalkar (0.5 sn), yenisi iner (1.31 sn, `pour`).                                                                                                                        |
| Aksiyon          | `StageAction`                                                   | Mıknatıslı buton, `Item light` içinde.                                                                                                                                                           |

Item varış fiilleri (`ItemKind`): `up`, `light`, `scale`, `left`, `right`,
`grow`, `dot`, `still`. Dock içinde (`SurfaceScene`) aynı fiiller φ² ≈ 2.6×
hızlı ve beklemeden (`eager`) oynar.

### 1.5 Efektler — `src/motion/effects`

| Efekt                             | Nerede                               | Not                                                                                                      |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `Projection`                      | Ana sayfa, film, kişi hero           | WebGL backdrop; 24 fps grain, halation, scroll'da odak kaybı (`scrub.defocus` 24 → 560 px). 1.071 satır. |
| `Ambient`/`Room`                  | Aynı                                 | Kenarlardan sızan renkli ışık; scroll'la yükselir.                                                       |
| `Carry`                           | Global (`providers.tsx`)             | Paylaşılan görsel: poster bir sayfadan diğerine uçar.                                                    |
| `Intermission`                    | Film, kişi                           | ~100 sn hareketsizlikte (`size(11)`) "ara" ekranı.                                                       |
| `Flowing`                         | Film, kişi                           | Yerleşim kayınca `[data-flow]` öğelerini FLIP ile kaydırır.                                              |
| `Cursor`                          | Global                               | Retikül imleç, kartları çerçeveler. 775 satır.                                                           |
| `Foil`, `Tube`, `Magnet`, `Grain` | Ödüller, video modal, aksiyon, Frame | —                                                                                                        |

### 1.6 Paralel motor — `Scene` (`src/motion/scene`)

Yalnızca hesap sayfalarında. `Stage`'in daha basit bir kopyası: kendi saati,
kendi `Leaving`'i, kendi `HeroStage`'i (≈ `Backdrop`), `CinemaTitle`'ı
(≈ `Title`), `Reveal`/`RowItem`'ı (≈ `Item`). Timeline kuyruğu, pace, grade,
carry, wall yok.

### 1.7 Ayrık parçalar

- **WebGL sahneleri** (`features/spotlights/gl`, ~2.500 satır): `Foundry`
  (Oscars), `Portrait` + swarm worker (Directors), `Wall` (Top 100). Her biri
  kendi zaman sabitleriyle çalışıyor.
- **CSS keyframe'leri** (`globals.css`): `cine-exit` (scroll-timeline ile
  çıkışta sönme), `home-reel`, `home-ticker-*`, `directors-*`, `oscars-*`,
  `ui-develop`, `film-drift`, `cine-shimmer`, tooltip'ler.
- **Transition kapısı:** `globals.css` transition'ları varsayılan olarak
  kapatıyor; yalnızca `[data-cinematic]`, `.ui-motion`, `.ui-scene` içinde
  açılıyor.

---

## 2. Ortak yaşam döngüsü (`Stage` sayfaları)

Bir film veya kişi sayfasının üç perdesi:

```
t=0 ─── backdrop yüklenene kadar her şey bekler (≤ 2.5 sn) ──► roll()
        │
        ├─ Backdrop  3.43 sn  1.45× → 1, blur 18 → 0, parlaklık 0.25 → 1
        ├─ Title     2.12 sn'de kelimeler yükselir (her biri 2.12 sn)
        ├─ Hairline  +0.81   çizgi çekilir
        ├─ Tagline   +0.5    kelime kelime
        ├─ Overview  +0.31   satır satır, satır içinde süpürme
        ├─ Sidebar   poster, istatistikler, aksiyonlar dalga halinde; olgular pozlanır
        └─ Section'lar görüş alanına girdikçe kuyruğa: header süpürmesi → içerik dalgası
                                                   (film ≈ 5.5 sn, kişi ≈ 5.2 sn'de "yerleşir")
SCROLL
        ├─ Backdrop: 0 → 900 px'te 240 px aşağı, 720 px'te 0.2'ye kararır, 1.32× yaklaşır
        ├─ Projection odağı 24 → 560 px arasında kaybolur
        ├─ Başlık katmanları (title, rule, tagline, prose) sırayla 0.2'ye kararır
        ├─ Ambient ışık 760 px'te tam yükselir
        └─ [data-exit] blokları ekranın üstünden çıkarken 0.15'e söner (CSS view-timeline)
ÇIKIŞ (link tıklandı)
        ├─ Navigasyon 1.03 sn bekletilir; sayfa tıklanamaz olur
        ├─ Kelimeler sırayla yukarı kalkar, olgular "yanar", çizgiler geri sarılır
        ├─ Body 36 px yukarı kalkıp söner; backdrop bulanıklaşıp kararır
        └─ Poster bir sonraki sayfaya taşınır; grade payload ile devredilir
```

Ana sayfa ve spotlight'lar bu döngünün kısaltılmış hâlini oynuyor (başlık
bloğu ve olgular yok).

---

## 3. Sayfa sayfa analiz

### 3.1 Ana sayfa — `/` (`features/home`)

| Konu        | Durum                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Motor       | `Stage`, `picture` (öne çıkan film varsa), `wash={false}`                                                                                                                                                                |
| Açılış      | `title.at + title.run + landed(1)` ≈ 4.7 sn. **`spotlights/opening.ts` ile birebir aynı formül, kopyalanmış** (B5).                                                                                                      |
| Hero        | Döner vitrin: 9 sn'lik döngü (`CYCLE_MS = 9000`, ölçek dışı), `Projection` makara geçişi, synopsis çapraz geçişi (`SWAP = size(2)`), makara ilerleme çubuğu CSS'te. Hover, focus, görünmezlik ve sekme gizlenince durur. |
| Section'lar | 11 section'ın hepsi aynı kalıpta: `Section > Header > Item light / Carousel`. **En tutarlı sayfa.**                                                                                                                      |
| Scroll      | Backdrop parallax, odak kaybı. Başlık katmanı yok.                                                                                                                                                                       |
| Kapanış     | Standart `Stage` çıkışı.                                                                                                                                                                                                 |

### 3.2 Film — `/movie/[id]`, `/movie/[id]/reviews` (`features/movie`)

Sistemin "amiral gemisi"; neredeyse her primitif burada.

| Konu          | Durum                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Partisyon     | `features/movie/motion.ts`: rule → tagline → overview zinciri, yalnızca `size()`/`landed()` ile. **Örnek alınacak dosya.**                       |
| Açılış        | Backdrop + `Title` + `Hairline` + `Words` (tagline kelime kelime, overview satır satır) + sidebar dalgası + olguların pozlanması + `MoneyCount`. |
| Scroll        | 4 katman ayrı aralıklarla kararır; backdrop parallax; `cine-exit`.                                                                               |
| Görünümler    | `ViewDeck`: overview ↔ awards (blur 12, lift 20 px). Geçişte gerekirse kolonun başına atlar.                                                     |
| Özel sahneler | Galeri duvarı (`Wall` fazları), `Slate` (still'e projeksiyon), `Intermission`, `Flowing`, video modalında `Tube` + salon ışıkları.               |
| Kapanış       | Tam çıkış + carry.                                                                                                                               |
| Not           | `/reviews` alt sayfası aynı `Stage`'i kullanıyor; başlık link oluyor. Tutarlı.                                                                   |

### 3.3 Kişi — `/person/[id]` (`features/person`)

Filmin aynası; aynı iskelet, farklı içerik fiilleri.

| Konu       | Durum                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Partisyon  | `features/person/motion.ts`: role etiketi, links, bio, facts penceresi, kariyer grafiği, timeline. Ölçeğe sadık.                                             |
| Farklar    | Backdrop yoksa `PersonPhotoGrade` (renk portreden). `wash` açık (filmde kapalı). Kariyer grafiği `grow`, timeline `dot` + `Trace` ekseni, olgularda `Count`. |
| Görünümler | `ViewDeck` 3 görünüm (main, timeline, awards).                                                                                                               |
| Kapanış    | Film ile aynı.                                                                                                                                               |

### 3.4 Oscars — `/oscars` (`features/spotlights/views/oscars.tsx`)

| Konu       | Durum                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor      | `Stage black` (gren ve sheen yok), `h-dvh overflow-hidden`: **sayfa scroll'u yok.** Tekerlek ve oklar bir sonraki yıla geçer (`useGestureStep`).                                                                                        |
| Hero       | WebGL `Foundry`: poster altına dökülüyor gibi. Sabitler ham: `LAMP_S 1.6`, `REVEAL_S 1.6`, `FILL_S 2.4`, `MELT_S 0.75`, `CAST_S 1.5`, `HEAT_S 2.6`, `SET_S 2.4`, `CUT_S 1.3`.                                                           |
| Kontroller | `YearDial`: CSS `oscars-rise` (`move`, `out-quint`), JS `animate(… size(1), dolly)`. Ölçeğe sadık.                                                                                                                                      |
| Katman     | `WinnersIndex`: kolon gecikmesi `0.1 + column × 0.04` (ham).                                                                                                                                                                            |
| Kapanış    | **Görünür çıkış yok.** `Stage` navigasyonu 1.03 sn bekletiyor ve sayfayı tıklanamaz yapıyor, ama spotlight sayfalarında `Body`, `Backdrop` ya da `useExit` dinleyen hiçbir şey yok. Kullanıcı bir saniye donmuş bir ekran görüyor (B7). |

### 3.5 Directors — `/directors` (`views/directors.tsx`)

| Konu       | Durum                                                                                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor      | `Stage black`, scroll yok, jestle adım.                                                                                                                                                                                                                                             |
| Koreografi | **Projedeki en karmaşık durum makinesi:** `wait → print → pour → rest` (ilk açılış), `leave → arrive → enter` (yönetmen değişimi). Süreler `size()` ile hesaplanıp CSS değişkeni olarak (`--print`, `--drain` …) `directors-*` keyframe'lerine veriliyor. **İyi bir köprü örneği.** |
| GL         | `Portrait` swarm: `GATHER_S 4.6`, `SCATTER_S 2.1`, `CRUMBLE_S 1.1`, `CONDENSE_S 2.6`, `DEVELOP_S 2.4`, `UNDEVELOP_S 0.7` (ham).                                                                                                                                                     |
| Sabır      | Yükleme `size(3)`, swarm `size(5)`, isimler `size(5)`.                                                                                                                                                                                                                              |
| Kapanış    | Oscars ile aynı: 1.03 sn görünür değişiklik olmadan bekleme.                                                                                                                                                                                                                        |

### 3.6 Top 100 — `/top-100` (`views/wall.tsx`)

| Konu    | Durum                                                                                                                                                                               |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor   | `Stage black`, canvas kendi sürükle/atalet fiziğini çalıştırıyor (`INERTIA 3.2`, `GLIDE_S 0.9`, `WHEEL_S 0.12`).                                                                    |
| GL      | `ARRIVE_S 0.6`, `WAVE_S 2.8`, `LAMP_S 1.1`, `NUMBERS_S 1.2`, `LOUPE_FADE_S 0.26` (ham).                                                                                             |
| Kapanış | Oscars ile aynı: 1.03 sn görünür değişiklik olmadan bekleme.                                                                                                                        |
| DOM     | **Kural 9 ihlali:** `[transition:opacity_1.2s]`, `[transition:opacity_0.35s]`, `[transition:color_0.3s]`. Filtre butonları `cine-fade` yerine elle yazılmış renk geçişi kullanıyor. |

### 3.7 Hesap — `/account/[username]/*` (`features/account`)

| Konu         | Durum                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motor        | **`Scene`, `Stage` değil.** Partisyon `Score` tipinde.                                                                                                                                                                                                     |
| Zaman ölçeği | `beat(n) = n × 0.382` (doğrusal), `span(n) = 0.618 × φⁿ` (= 1.236 × `size(n)`, ızgara dışı). Örnekler: backdrop itişi `span(5)` = 6.85 sn, başlık `span(2)` = 1.62 sn (filmde 2.12), kelime aralığı `0.14` ham, çıkış `beat(3.1)` = 1.18 sn (filmde 1.03). |
| Açılış       | `HeroStage` (Backdrop kopyası), `CinemaTitle` (kelimeler 5° dönerek, 18 px blur'dan), avatar, istatistikler, kural, bio; `Reveal` ile section.                                                                                                             |
| Scroll       | Backdrop parallax ve kararma **aynı sayılarla kopyalanmış** (900/240, 720/0.2). Başlık 600 px'te 56 px kayar. Motor **ayarlanmıyor**: varsayılan `0.11 / 1`.                                                                                               |
| Sekmeler     | Layout sekmeler arasında kalıyor; içerik değişimi **anlık** (yalnızca `SlidingPill` kayıyor). Film/kişide aynı iş `ViewDeck` ile yapılıyor.                                                                                                                |
| Kapanış      | Hesap içinde (`scope`) çıkış yok; geri tuşunda çıkış yok (`history: false`). Carry ve grade devri yok.                                                                                                                                                     |

### 3.8 Yasal — `/privacy`, `/terms` (`features/legal`)

| Konu  | Durum                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Motor | Yok. Düz `<main>`.                                                                                                                                                                                                                                           |
| Sonuç | `data-cinematic` / `.ui-motion` olmadığı için `globals.css` **tüm transition'ları kapatıyor**: linklerin hover/focus geçişi anlık. "İki vuruş" kuralı (§4.1) bu sayfada çalışmıyor. Giriş ve çıkış da yok; bir film sayfasından buraya geçiş sert bir kesme. |

### 3.9 Katmanlar (dock, modal, menü, toast)

`config/theme/*.ts` dosyaları `motion.durations` / `motion.easings` üzerinden
**tamamen ölçeğe sadık**. `DESIGN.md §5.2`'deki "Layer motion" paragrafı burayı
doğru anlatıyor. Sorun yok.

### 3.10 Özet tablo

| Sayfa     | Motor | Ölçek             | Scroll ilişkisi             | Açılış            | Kapanış          | Tutarlılık |
| --------- | ----- | ----------------- | --------------------------- | ----------------- | ---------------- | ---------- |
| Ana sayfa | Stage | ✓                 | parallax, defocus           | backdrop + vitrin | tam + carry      | Yüksek     |
| Film      | Stage | ✓                 | parallax, defocus, 4 katman | tam partisyon     | tam + carry      | Yüksek     |
| Kişi      | Stage | ✓                 | aynı                        | tam partisyon     | tam + carry      | Yüksek     |
| Oscars    | Stage | DOM ✓ / GL ✗      | yok (jest adımı)            | GL döküm          | yok (1 sn donma) | Orta       |
| Directors | Stage | DOM ✓ / GL ✗      | yok (jest adımı)            | durum makinesi    | yok (1 sn donma) | Orta       |
| Top 100   | Stage | ✗ (ham CSS + GL)  | canvas fiziği               | GL dalga          | yok (1 sn donma) | Düşük      |
| Hesap     | Scene | ✗ (`beat`/`span`) | parallax (kopya)            | ayrı partisyon    | kısmi            | Düşük      |
| Yasal     | —     | —                 | yok                         | yok               | yok              | Yok        |

---

## 4. Bulgular

Önem sırasıyla. Her biri bir dosyaya bağlanıyor.

**B1 — İki koreografi motoru.**
`src/motion/scene/scene.tsx` ve `src/motion/stage/stage.tsx` aynı işi (giriş,
scroll'da kararma, çıkış) iki farklı API ve iki farklı zaman ölçeğiyle yapıyor.
`useLeaving` adı iki modülden de dışa aktarılıyor. Hesap sayfası için
`HeroStage ≈ Backdrop`, `CinemaTitle ≈ Title`, `Reveal ≈ Item`,
`SceneBody ≈ Body`. Bakım iki katı; bir değeri değiştiren kişi iki yeri
bilmek zorunda.

**B2 — Scroll hissi tutarsız.**
`Stage` `smooth.tune(GRAMMAR.scroll)` çağırıyor (`stage.tsx:148`). `Scene` ve
yasal sayfa çağırmıyor. Film sayfasından hesaba geçince tekerlek daha hızlı
ve daha sert hale geliyor. Bu, kullanıcının en çok hissettiği tutarsızlık.

**B3 — Scroll ilişkileri gramer dışında.**
`Backdrop` (`stage.tsx`): `[0,900]→[0,240]`, `[0,720]→[1,0.2]`; `Body`: `-36`;
`Ambient`: `FADE = 760`; `CinemaTitle`: `[0,600]→[0,-56]`; `HeroStage` aynı
sayıların kopyası. `GRAMMAR.layers` ve `GRAMMAR.scrub` var ama bu değerler
oraya taşınmamış. "Scroll motoruyla ilişki" bugün tasarım sisteminin değil,
bileşenlerin içinde.

**B4 — WebGL sahnelerinin zamanları ölçek dışı ve belgesiz.**
`gl/foundry/renderer.ts`, `gl/portrait/renderer.ts`, `gl/wall/renderer.ts`.
`DESIGN.md §7` "page choreography keeps its own timings" diyerek izin veriyor,
fakat hangi sabitlerin bilinçli istisna, hangilerinin rastgele seçildiği
belli değil. Bazıları ölçeğe çok yakın: `CUT_S 1.3 ≈ size(2)`,
`2.1 ≈ size(3)`, `0.75 ≈ size(1)`.

**B5 — Küçük ölçek ihlalleri ve kopyalar.**

- `wall.tsx`: `[transition:opacity_1.2s]`, `0.35s`, `color_0.3s` (kural 9).
- `winners-index.tsx`: `delay: 0.1 + column * 0.04`.
- `home/components/hero.tsx`: `CYCLE_MS = 9000`.
- `effects/shared-image.tsx`: `FADE = 0.28` ve `EASE` dışında üç bezier
  (`ACROSS`, `DOWN`, `GROW`).
- `stage/picture.tsx`: `{ damping: 17, stiffness: 52 }` yayı `SPRING`'de yok.
- `stage/text.tsx` `useInk` ve `CinemaTitle` renk geçişi: `0.6` ham.
- `home/view.tsx` `OPENING` = `spotlights/opening.ts` `SPOTLIGHT_OPENING`.

**B6 — Kullanılmayan scroll karmaşıklığı.**
`engine.ts` içinde `stopAt`, `hold`, `held`, `pressed`, `leave`, `steady`,
`dwell`, `rises` (~120 satır) yalnızca durak noktaları için var; `stopAt`'ı
hiçbir yer çağırmıyor. Ya bir sayfanın tasarımına bağlanmalı (ör. kişi
sayfasında görünümler arasında "tutan" scroll) ya da kaldırılmalı.

**B7 — Çıkış semantiği sayfaya göre değişiyor.**
`Stage`: her navigasyonda çıkış, geri tuşunda carry yok. `Scene`: kapsam
içinde ve geri tuşunda çıkış yok. Yasal: hiç yok. Spotlight: en kötü durum;
`Stage` navigasyonu 1.03 sn bekletiyor ama sayfada çıkış saatini dinleyen
hiçbir şey olmadığı için kullanıcı bir saniye donmuş bir ekran görüyor,
sonra sert bir kesme geliyor.

**B8 — Görünüm değişimi için iki dil.**
Film/kişi `ViewDeck` (blur + lift + scroll düzeltme), hesap sekmeleri anlık.
Aynı kullanıcı hareketi (sekme değiştirmek) iki sayfada iki farklı cevap
alıyor.

**B9 — Yasal sayfalarda hover geçişi kapalı.**
`globals.css` transition kapısı yüzünden. Muhtemelen bilinçli değil.

**B10 — `DESIGN.md` motion'ı yarım anlatıyor.**
§3.6 ölçeği, §4.1 iki vuruşu, §5.2 katmanları iyi anlatıyor. Fakat sayfa
yaşam döngüsü, timeline kuyruğu, pace, çıkış, carry, grade geçişi, wall,
scroll motoru ve `pour`/`dolly` eğrileri belgede yok. §6 "Entrances" dört
maddeden ibaret.

**Olumlu tespitler** (korunmalı):

- Reduced motion her katmanda ele alınmış: motor doğal scroll'a döner,
  `MotionConfig reducedMotion="user"`, CSS `prefers-reduced-motion`, GL
  `setReduced`.
- Film ve kişi partisyonları (`motion.ts`) yalnızca `size()`, `hand()`,
  `landed()` kullanıyor: zaman zincirleri okunabilir ve tek satırdan ayarlanabilir.
- Directors'ın `size()` → CSS değişkeni → keyframe köprüsü, GL/CSS
  koreografisini sisteme bağlamanın iyi bir örneği.
- Katmanlar (dock, modal, menü) tamamen ölçekte.

---

## 5. "Her sayfa benzer animasyon mu sergilemeli?"

**Hayır, aynı animasyonu değil, aynı dili.** Sinema benzetmesi bu projede zaten
var, onu sürdürmek en doğal olanı: bir filmin her sahnesi farklı çekilir ama
kurgunun ritmi, renk düzeni ve geçiş kuralları bütün filmde aynıdır.

Bu yüzden motion'ı iki katmana ayırmayı öneriyorum.

### 5.1 Değişmezler (her sayfada aynı)

Kullanıcı bunları "Guffin hissi" olarak algılar. Sayfadan sayfaya değişmeleri
hata sayılır.

| Değişmez                | Bugünkü kaynak                      | Bugün ihlal eden             |
| ----------------------- | ----------------------------------- | ---------------------------- |
| Zaman ölçeği ve eğriler | `tempo.ts`, `@theme`                | Hesap, GL, Top 100 DOM       |
| Scroll hissi            | `GRAMMAR.scroll`                    | Hesap, yasal                 |
| Etkileşim vuruşları     | §4.1, `globals.css`                 | Yasal (transition kapalı)    |
| Katman hareketi         | `config/theme/*`                    | —                            |
| Section girişi          | `Section` + `Header` + `Item light` | Hesap (`Reveal`)             |
| Çıkış süresi ve biçimi  | `GRAMMAR.exit`                      | Hesap (1.18 sn), yasal (yok) |
| Görünüm değişimi        | `ViewDeck`                          | Hesap sekmeleri              |
| Reduced motion          | her yer                             | —                            |

### 5.2 Değişkenler (sayfanın kendi partisyonu)

Sayfanın karakterini taşıyanlar. Bunlar farklı olmalı, ama yalnızca ölçekten
türetilmiş adlı değerlerle ve sayfanın `motion.ts` dosyasında.

- Açılış sırası: ne, hangi sırayla, hangi gecikmeyle girer.
- Hero ortamı: `Projection`, WebGL sahne, avatar, hiçbiri.
- Scroll ilişkileri: hangi katmanlar kararır, ne kadar parallax.
- Özel sahneler: wall, intermission, döküm, swarm.

### 5.3 Üç sayfa türü

| Tür        | Sayfalar                   | Karakter                                                                                           | Zorunlu iskelet                                                           |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Film**   | Ana sayfa, film, kişi      | Tam gösterim: görsel açılır, başlık yazılır, section'lar sırayla gelir, çıkışta poster taşınır.    | `Stage picture` + `Backdrop` + `Body` + `Section`'lar                     |
| **Salon**  | Oscars, Directors, Top 100 | Tek parça, tam ekran enstalasyon. Scroll yok, jestle adım. Sahne kendi koreografisini oynar.       | `Stage black` + `SpotlightDock` + jest + sahnenin `open/close` sözleşmesi |
| **Defter** | Hesap, yasal, (ayarlar)    | Sakin. Görsel varsa açılır ama başlık "yazılmaz"; içerik `light` ile belirir. Kayıt ve okuma için. | `Stage` (sessiz ön ayar) + `Section`'lar                                  |

Defter türü hesap sayfasının bugünkü `Scene`'inin yerini alır. Yasal sayfalar
da buraya girer ve transition kapısı sorunu kendiliğinden çözülür.

---

## 6. `DESIGN.md`'ye entegrasyon önerisi

### 6.1 Belge yapısı

`DESIGN.md` içine yeni bir **"Motion"** bölümü (mevcut §3.6, §6, §7'deki
motion parçaları buraya toplanır). Uzarsa `MOTION.md` olarak ayrılıp
`DESIGN.md`'den linklenir. Önerilen başlıklar:

1. **Katmanlar ve sahiplik:** bölüm 1'deki harita, "bir değer nereye gider"
   tablosu.
2. **Ölçek:** mevcut §3.6 + eksik `pour`, `dolly` (ikisine CSS token'ı da
   eklenir), `hand()`, `landed()`, `spread()`, `settle()`.
3. **Yaşam döngüsü:** açılış → scroll → çıkış sözleşmesi (bölüm 2), pace,
   timeline kuyruğu.
4. **Sayfa türleri:** bölüm 5.3 tablosu, her tür için zorunlu iskelet.
5. **Partisyon kuralı:** her sayfanın `features/<x>/motion.ts` dosyası olur;
   `SCENE = { ...GRAMMAR, … }` biçimindedir ve yalnızca `size()`, `hand()`,
   `landed()` kullanır. Bileşenler sayı değil `SCENE.*` okur.
6. **Scroll ilişkileri:** `GRAMMAR.scrub` / `GRAMMAR.layers` altında adlı
   değerler (parallax, dim, push, drift, lift). Scroll'a bağlı her dönüşüm
   buradan okur.
7. **Fiiller:** `ItemKind` listesi, `Develop`, `Expose`, `Words`, `ViewDeck`
   ne zaman kullanılır.
8. **İstisnalar:** GL sahnelerinin sabitleri, adlarıyla ve neden ölçek dışı
   olduklarıyla. Listede olmayan her ham sayı hatadır.
9. **Kontrol listesi ve denetim komutları:** ör.
   `grep -rnE 'duration: [0-9]|delay: [0-9]|\[transition:' src`.

### 6.2 Yol haritası

| Faz | İş                                                                                                                                                                                                                                                                                                          | Risk  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Scroll ilişkilerini `GRAMMAR`'a taşı (B3). `OPENING` kopyasını kaldır, `wall.tsx` ham transition'larını ve diğer B5 maddelerini düzelt. `pour`/`dolly` CSS token'ları. `DESIGN.md` Motion bölümü.                                                                                                           | Düşük |
| 2   | Scroll ayarını motorun varsayılanı yap ya da provider'a taşı (B2). Yasal sayfaları `Stage`'in sessiz ön ayarına al (B9).                                                                                                                                                                                    | Düşük |
| 3   | Hesabı `Stage`'e taşı: `Score` → `SCENE extends GRAMMAR`, `HeroStage` → `Backdrop`, `CinemaTitle` → `Title` varyantı, sekmelere `ViewDeck`. Ardından `src/motion/scene`'i sil (B1, B7, B8).                                                                                                                 | Orta  |
| 4   | GL sahneleri için ortak bir sözleşme: `open()`, `close(progress)`, `setReduced()`; sabitleri adlandır, ölçeğe yakın olanları `size()`'a bağla, kalanları istisna listesine yaz (B4). Canvas ve DOM çıkış saatini dinlesin; o zamana kadar bile spotlight'lara en azından bir `Body` sönmesi eklenmeli (B7). | Orta  |
| 5   | `stopAt` için karar: bir sayfaya bağla ya da kaldır (B6).                                                                                                                                                                                                                                                   | Düşük |

---

## 7. Senin vermen gereken kararlar

1. **Hesap sayfası hangi türde?** Defter (önerim) mi, yoksa profil sahibinin
   backdrop'u varken Film türü mü?
2. **Yasal sayfalar motion alsın mı?** Önerim: yalnızca Defter'in sessiz girişi
   ve çalışan hover vuruşları.
3. **WebGL sahneleri ölçeğe bağlansın mı, yoksa belgelenmiş istisna olarak mı
   kalsın?** Önerim: ölçeğe yakın olanlar bağlansın, gerisi adıyla istisna
   listesine girsin.
4. **`stopAt` ne olacak?** Kullanmak istediğin bir "tutan scroll" anı var mı?
5. **Motion `DESIGN.md` içinde mi yaşasın, ayrı `MOTION.md`'de mi?**
