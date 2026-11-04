# Guffin Motion Motoru

> Tasarım sözleşmesi (kurallar, tablolar, kontrol listesi) `DESIGN.md` bölüm 6'dadır. Bu belge motorun ayrıntılı referansıdır.

`src/motion/`: Guffin'in tek motion motoru. Bütün sayfalar, dock yüzeyleri, tekerlek ve stylesheet'teki süreler bu motordan gelir; eski `stage`/`scene`/`scroll` sistemleri silindi. Geçişin nasıl yapıldığı "Sayfalara geçiş" bölümünde.

## Temel fikir

Motor **hareketleri** değil **kanunları** standartlaştırır.

- Sayfa bir **partisyon** (score) yazar. Partisyonda sahnede kimlerin olduğu, her parçanın neyden yapıldığı ve hangi sırayla geldikleri yazılır.
- Partisyonda tek bir süre bile yazmaz. Zaman motora aittir.
- Her sayfanın koreografisi farklıdır, ama hepsi aynı fizikle çalışır.

```ts
const movie = defineScore({
  tempo: 0,
  cast: {
    backdrop: { matter: "plate", depth: 3 },
    title: "ink",
    facts: "light",
    poster: { matter: "paper", drift: 1 },
    review: "paper",
  },
  opening: ["backdrop", "title", "facts", "poster"],
  sections: { reviews: ["review"] },
  leave: "burn",
});
```

## Katmanlar

| Dosya (`src/motion/`)                                                       | Sorumluluk                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`, `constants.ts`, `utils.ts`                                      | Motorun bütün tipleri (`Curve`, `Spring`, `Frame`…), sabitleri (`PHI`, `BEAT`, `POINTS`, tüm dosya sabitleri) ve yardımcıları: merdiven (`step`, `haze`, `reach`, `tempo`, `trail`), eğriler (`bezier`, `cubic`), kapalı formda yaylar (`springAt`, `springForce`), `tween`. Nötrdür: sunucudan da içe aktarılır |
| `time.ts`                                                                   | Madde tablosu, fiiller (`arrival`, `departure`, `response`), eğri/yay tabloları; çerçevenin `motion` ayarı ve `SPRING`, `HAZE_CAP`                                                                                                                                                                               |
| `engine.ts`                                                                 | Tek saat (okuma, güncelleme, çizim fazları), `Signal` ve `Value`, duyular: scroll, viewport, pointer                                                                                                                                                                                                             |
| `forces.ts`                                                                 | Kuvvet alanları (derinlik, sürüklenme) ve dokunuş: hover/press yayları, maddeye göre                                                                                                                                                                                                                             |
| `color.ts`                                                                  | Görünüm cebiri (`look`), oda rengi (`tint`, OKLCH'de çapraz geçiş, `--tint`) ve merdivenin CSS değişkenleri (`tokens`)                                                                                                                                                                                           |
| `score.ts`                                                                  | `defineScore`, `plan` (partisyonun kâğıt üzerindeki zamanlaması)                                                                                                                                                                                                                                                 |
| `stage.ts`                                                                  | Çalışma zamanı: dikkat kuyruğu, yaşam döngüsü, çizim                                                                                                                                                                                                                                                             |
| `scroll.ts`                                                                 | Scroll sürücüsü: tekerlek bir kuvvet, sayfa merdivendeki bir yayla takip eder                                                                                                                                                                                                                                    |
| `carry.ts`                                                                  | Devir: basılan resim sayfalar arasında uçar, yeni sayfadaki eşine iner                                                                                                                                                                                                                                           |
| `render.ts`                                                                 | Canvas/WebGL parçası (`mountScene`), GL yardımcıları ve metni kelime/satır kardeşlerine bölme                                                                                                                                                                                                                    |
| `react.tsx`                                                                 | `EngineProvider`, `bindScore` → `StageRoot`, `SurfaceRoot`, `usePart`, `useSection`, `useScene`, `Text`, `useAct`, `useStage`; ayrıca `useTouch`, `useScrollDriver`, reduced motion                                                                                                                              |
| `kit.tsx`                                                                   | Kit bileşenleri: `Header`, `Count`, `Swap`, `Deck`, `Room` ve evin ışıkları (`house`)                                                                                                                                                                                                                            |
| `marquee.tsx`, `expose.tsx`, `wall.tsx`                                     | Kit: kayan şerit, parça açığa çıkarma, galeri duvarı (+ bloom)                                                                                                                                                                                                                                                   |
| `projection.tsx`, `cursor.tsx`, `tilt.tsx`, `screen.tsx`, `transitions.tsx` | Efektler: projeksiyon, özel imleç, afiş eğilmesi/folyo/mıknatıs, CRT + boşta ekranı + favicon boyası, yerleşim kayması ve film sayfası devri                                                                                                                                                                     |

## Kanunlar

### 1. Zaman: tek merdiven

- Her süre `step(n) = 0.5 · φⁿ` merdivenindeki bir basamaktır.
- Sayfa yalnızca **tempo** seçer (−3…+3), yani merdivende kaç basamak kayacağını.
- Merdiven geometrik olduğu için tempo tüm süreleri aynı oranda büyütür ya da küçültür. İki parça arasındaki oran asla bozulmaz.

| n   | −2   | −1   | 0    | 1    | 2    | 3    | 4    |
| --- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| sn  | 0.19 | 0.31 | 0.50 | 0.81 | 1.31 | 2.12 | 3.43 |

Bir sayfa her açılışta aynı oynar: tekrar ziyaret için ayrı bir hız yoktur (`REVISIT_PACE` ve `memory` kaldırıldı).

### 2. Madde: süre değil, ağırlık

Parça süre söylemez, neyden yapıldığını söyler. Motor süreyi maddeden türetir: varış süresi `step(rung + tempo)`.

| Madde   | Basamak | Varış  | Kütle | Sönüm | Giriş   | Çıkış | Örnek                |
| ------- | ------- | ------ | ----- | ----- | ------- | ----- | -------------------- |
| `light` | 2       | 1.31 s | φ⁻²   | 1     | glow    | fade  | etiket, künye, sayı  |
| `glass` | 2       | 1.31 s | φ⁻¹   | 1     | clear   | fog   | panel, overlay       |
| `ink`   | 3       | 2.12 s | φ⁻¹   | 0.9   | rise    | fade  | başlık, metin        |
| `paper` | 3       | 2.12 s | 1     | 0.86  | lift    | sink  | kart, poster, satır  |
| `metal` | 4       | 3.43 s | φ³    | 0.72  | settle  | sink  | heykelcik, ağır obje |
| `plate` | 4       | 3.43 s | φ²    | 1     | develop | cool  | backdrop, fotoğraf   |

Hiçbir parça 1.31 saniyeden kısa sürede gelmez. Büyük başlık `focus` fiiliyle girer: `{ matter: "ink", enter: "focus" }`.

- **Çıkış:** varıştan iki basamak kısa sürer ve hiçbir zaman `step(2)`yi aşmaz. Sayfa, geldiğinden hızlı ayrılmalıdır.
- **Tepki:** imleç ya da sürükleme gibi bir "el" dokunduğunda parça, aynı maddenin varışından üç basamak hızlı bir yayla cevap verir. Yayın periyodu da merdivendedir.
- **Kütle:** itmeye karşı direnci belirler (`Value.push`).

### 3. Fiil: hareketin şekli

Fiil bir fonksiyondur: ilerlemeyi alır, görünümü döndürür. Süre içermez.

- **Giriş fiilleri:** `glow`, `rise`, `focus`, `lift`, `clear`, `develop`, `settle`, `wipe`, `door`, `still`.
- **Çıkış fiilleri:** `fade`, `sink`, `fog`, `cool`, `burn`, `still`.
- **Parça parça:** hiçbir şey blok olarak gelmez. Paragraf kelime kelime (`read`), tagline harf harf, başlık lamba → harfler → çizgi → aksiyonlar (`Header`), sidebar satır satır merdiven (`descend`, `cadence: "stairs"`). Aksiyonlar da (segmented control sekmeleri dahil) tek tek girer.
- **Odak kuralı:** fiiller yalnızca solmaz ve kaymaz; bulanıklıktan çıkar. Opaklık yolun φ⁻¹'inde oturur, ölçek ve bulanıklık hareketle birlikte biter. Gözün gördüğü son şey, parçanın netleşmesidir.
- **Işık kuralı:** ışık yolun φ⁻¹'inde tamamlanır. Bir parça yerine oturmadan önce okunur hale gelir.
- **Değerler de merdivenden gelir.** Mesafeler `reach(n) = 24 · φⁿ` px. Bulanıklık ve parlaklık φ'nin kuvvetleridir.

### 4. Dikkat: tek kuyruk

- **Sıra:** bir sahnede aynı anda tek bir "beat" dikkat ister.
- **Bindirme:** sonraki beat, öncekinin **üç basamak içinde** başlar (`CUE_LEAD = 3`), yani göz onu bulduğunda, o oturduğunda değil. Maddeler bir basamak yavaşladı, bindirme bir basamak uzadı: beat'ler eskisi gibi aynı anda başlar, her parça bir öncekiyle daha çok iç içe geçer.
- **Kardeşler:** aynı parçanın kopyaları `cadence` ile gelir. Satır ve kartlar altın `trail` ile (her boşluk bir öncekinin φ⁻¹'i); kelime, harf ve satırlar `even` ile: konuşma gibi eşit aralıklı, sonda yığılmadan; satır ve düğme sütunları `stairs` ile: üstten alta tek tek, bütün iniş bir varıştan uzun sürmeden. Sayı ne olursa olsun hepsi, parçanın bir basamak altındaki pencereye sığar.
- **Açılış sabit bir zaman parçasıdır.** Perde, açılışın parçaları hazır olana (resim, yazı tipleri) ya da `PATIENCE` dolana kadar kapalı kalır. Sonra bütün açılış tek seferde saate yazılır: her beat, partisyonun kendi zaman çizelgesindeki (`stage.timeline`) yerinde, perdenin kalktığı kareden itibaren sayılır. Perdeden önce bekleme vardır, sonrası her zaman aynı dizidir. Kare hızına, scroll'a, birikmeye, parçaların mount sırasına ya da önceki ziyarete bağlı değildir. Geç mount olan kopya, çizelgedeki yerine girer.
- **Hazır olma:** `usePart(name, { ready: false })` olan bir parça hazır olana kadar perdeyi bekletir, en fazla `PATIENCE = step(3)` kadar. Perdeyi bilerek tutan bir parça (başlık kartı) `patience` ile daha uzun bekletebilir.
- **Koşullu es:** `{ rest: n, with: "parça" }` yalnızca o parça sahnedeyken alınır. Zaman çizelgesi perde kalkarken, sahnedeki parçalara göre kurulur; bir sayfada olmayan parçanın beklemesini o sayfa ödemez.
- **Sahneler:** `useSection` ile scroll'la tetiklenen bölümler aynı kuyruğa girer. Tetikleme anı, bölümün üst kenarının ekranın φ⁻¹'ine gelmesidir.
- **Birikme:** kuyrukta bekleyen her başka cue boşluğu bir basamak kısaltır, en fazla iki basamak (`HURRY_CAP`). Hızlı kaydıran kullanıcı animasyon beklemez.
- **Unutulan parça:** partisyonda yer alıp hiçbir beat'te çağrılmayan parça, açılışın son beat'iyle gelir. Hiçbir parça karanlıkta kalamaz.

### 5. Kuvvet: derinlik ve sürüklenme

- **Derinlik:** `depth: d` olan parçanın ekrandaki hızı scroll'un `φ^(−d/2)` katıdır.
  - Geçildikçe parça `φ^−d` parlaklığa kadar kararır ve `d·φ` px bulanıklaşır.
  - `fixed` ve akıştaki elemanlar aynı görünür hızla hareket eder.
  - Negatif derinlik öne çıkar: parça daha hızlı hareket eder ve kararmaz.
- **Sürüklenme:** `drift: k` olan parça imlece `reach(−2) · k` px kadar eğilir. Bunu maddenin tepki yayıyla yapar.

Sayfa hiçbir zaman "900 px'te 240 px kaydır" demez, yalnızca derinlik verir.

### 6. Yaşam döngüsü

```
waiting → arriving → present → leaving → gone
```

- `stage.leave()` tüm parçaları birlikte, maddelerine göre çıkarır. Toplam süre önceden bellidir (`stage.leaveLength`), böylece navigasyon tam o kadar bekleyebilir.
- Ayrılma sırasında yeni bir şey gelmez.
- Yarıda kalan bir giriş, bulunduğu yerden çıkar.

### 7. Saygı

- **Reduced motion:** her şey aynı anda, `step(−1)` sürede yalnızca opaklıkla gelir. Hareket, derinlik ve sürüklenme yoktur.
- **Boşta durma:** saat yalnızca bir şey hareket ederken çalışır. Boştayken kare harcamaz.
- **Kare sınırı:** bir kare en fazla 1/20 sn ilerler, böylece sekme geri geldiğinde zıplama olmaz.
- **`will-change`:** yalnızca hareket sırasında yazılır.
- **JavaScript yoksa:** `[data-part]` parçaları doğrudan görünür olur.

### 7b. Odak: bulanıklık bir basamaktır

- Bulanıklık zaman gibi merdivendedir: `haze(n) = φⁿ` px, CSS'te `--haze-n1 … --haze-6`. Parça başına üst sınır `HAZE_CAP = haze(6)`; kuvvetler toplansa da aşılmaz.
- **Cam filtre taşımaz.** Bir elemandaki `filter`, altındaki her `backdrop-filter`ın arkaplanını alır. Katmanlar (modal, menü, dock) opaklık ve ölçekle açılır; içindeki yazı, ikon ve satırlar bulanıklıktan çıkar.
- Basma `haze(−1)` kadar yumuşatır; bir sırada işaret edilen kartın komşuları `haze(1)` kadar odak dışı kalır (`data-rack`).
- Reduced motion bulanıklığı da kaldırır.

### 8. Dokunuş: aynı madde, elin hızında

- Bir el (hover, odak, basma) parçaya bir **kuvvet** olarak girer; kuvvetin gölgesi alanlardan sonra harmanlanır.
- Hover maddenin tepki yayıyla gelir; basma bir basamak daha hızlı iner, hover hızında bırakır.
- Fiiller: `press` (φ⁻⁷ kadar küçülür ve `haze(−1)` kadar yumuşar), `lift` (`reach(−3)` yükselir, φ⁻⁸ büyür), `glow` (φ⁻⁴ parlar).
- Parça için `usePart(name, { touch: "lift" })`. Parça olmayan bir buton için `useTouch({ verb, matter })`; bu yalnızca `transform` ve `filter` yazar.
- Klavye: `:focus-visible` hover sayılır, Enter basmadır.

### 9. Scroll: tekerlek bir kuvvettir

- `EngineProvider drive` ile motor tekerleği sürer. Her tekerlek adımı hedefi kaydırır; sayfa onu sönümü kritik bir yayla izler. Periyot `step(1 + tempo)`: ağır sayfa ağır kayar.
- Sayfanın temposu sürücüye `StageRoot` tarafından verilir ve sayfa ayrılınca geri alınır.
- Tarayıcının kendi kaydırmaları (klavye, scrollbar, dokunmatik, çapa) **benimsenir**, hiçbir zaman engellenmez.
- İç içe kaydırılabilir alanlar, `data-scroll-native`, kilitli sayfa (`overflow: hidden`), yatay ve Ctrl/⌘ tekerlek sürülmez. Dock yüzeylerinin kaydırma kutuları `data-scroll-native` taşır (eski `data-lenis-prevent`'in yerine): tekerlek kutunun sonuna gelse de arkadaki sayfaya geçmez (`overscroll-contain`).
- Yeni bir sayfa başta açılır; bunu tarayıcı ve router yapar, sürücü yalnızca yeni yeri benimser.
- Kaydırma sürerken `<html data-scrolling>`. Reduced motion'da sürücü devre dışıdır.
- Motorun `scroll` değeri sürücüden aynı karede gelir; derinlik alanı gecikmesiz çalışır.

### 10. Navigasyon: ayrılış sözleşmesi

- `StageRoot` framework navigasyonuna bir hold kaydeder. Başka bir path'e giden her yolculukta `stage.leave()` oynar; route ancak sahne `gone` olunca istenir.
- Aynı sayfada sorgu ya da hash değişimi ayrılış sayılmaz (`leaves` prop'u ile değiştirilebilir).
- Yolculuk iptal olursa (`trip.signal`) `stage.stay()`: parçalar bulundukları yerden geri gelir, partisyon kaldığı yerden devam eder.

### 11. Devir: bir resim iki sayfa arasında

- `usePart("poster", { carry: "poster" })` parçayı hem taşınabilir hem de alıcı yapar.
- Elin bastığı kaynak, sayfa ayrılırken iki sayfanın üstündeki bir katmana kopyalanır ve orada bekler.
- Yeni sayfada aynı anahtarı isteyen parça **son yerinde ama görünmez** yerleştirilir; resim tam oraya uçar, iner ve parça devralır. Uçuş `step(min(rung + tempo − 1, 2))` sürer, `glide` eğrisiyle.
- Alıcının beat'i iniş bitene kadar bekler; açılışın geri kalanı uçuşla uyumlu oynar.
- Kimse almazsa resim `step(6)` sonra yerinde söner. Alıcı yeniden mount olursa (strict mode) uçuş kaybolmaz.

### 12. Renk: oda resimden gelir

- `StageRoot grade={…}`: bir resim adresi (motor tonunu okur), bir `Tint` ya da `null` (karanlık oda). Verilmezse oda önceki rengini korur.
- Ton, resmin renkli orta tonlarının oyuyla bulunan **tek bir hue**'dur; açıklık ve kroma sabittir (OKLCH 0.74 / 0.1). Her sayfanın ışığı aynı güçte, yalnızca rengi değişir.
- Renk `step(3)` sürede hue çemberinin kısa yolundan geçer; `<html>` üzerinde `--tint` ve `--tint-presence` olarak yayınlanır. Odanın ışığı `--light` (renk) ve `--grade` (sRGB kanalları, `rgb(var(--grade) / α)` yazan sınıflar için: `bg-grade/15`, `text-grade`) olarak da yayınlanır.
- Motor sayfalar arasında yaşadığı için renk kendiliğinden devredilir; yeni sayfa kendi resmini okuyana kadar önceki renk kalır.

### 13. Metin ve sahne

- `<Text part="title" text={…} by="line" mask as="h1" />`: metin kelimelere bölünür; `by="line"` aynı satırdaki kelimeleri birlikte, satırları sırayla getirir. `mask` her kelimeyi kendi satır kutusundan yükseltir. Erişilebilirlik için kapsayıcı `aria-label` taşır.
- `useScene(name, setup)`: canvas bir parçadır. `setup(canvas)` bir `Renderer` döndürür; `draw(frame)` her karede görünümü (`look`), giriş/çıkış ilerlemesini, scroll'u, imleci ve boyutu alır. `true` döndürdükçe her kare çizilir; aksi halde yalnızca bir şey değiştiğinde. Ekran dışında ve reduced motion'da döngü durur. Piksel oranı varsayılan olarak 2 ile sınırlı.

### 14. CSS: aynı merdiven stylesheet'te

`EngineProvider` şu değişkenleri `:root`'a yazar, her biri `var(--tempo)` ile çarpılır (`StageRoot` kendi alt ağacında `--tempo = φ^tempo` kurar):

- `--step-n6 … --step-6`: merdivenin basamakları.
- `--arrive-<madde>`, `--leave-<madde>`, `--touch-<madde>`, `--curve-<madde>`.
- `--curve-<eğri>`: `fade`, `silk`, `pour`, `expo`, `glide`, `fall`, `linear`.

Bir CSS değişkeni tanımlandığı elemanda çözülür; `:root`'ta tanımlı bir `calc(… * var(--tempo))` alt ağaçtaki `--tempo`'yu hiç görmez. Bu yüzden token'lar `:root,[data-tempo]` için yazılır ve `StageRoot` / `SurfaceRoot` kendi köklerine `data-tempo` koyar: tempo −2 olan bir yüzeyde `--step-0` gerçekten `500ms · φ⁻²`'dir.

`globals.css` artık kendi sürelerini yazmaz. `duration-*` yardımcıları, `--touch-in/out`, `--press-*` ve görüntü geçişleri `--step-*` basamaklarını kullanır (`duration-leave` = `--step-n2`, `duration-reveal` = `--step-0`, `duration-linger` = `--step-3` …). Motorda karşılığı olan eğriler (`--ease-fade`, `--ease-out-expo`, `--ease-out-quint`, `--ease-in-out-cubic`) `--curve-*`'e bağlıdır; motorda olmayan dördü (`quart`, `in-cubic`, `cream`, `phosphor`) yerinde kaldı.

Framework'ün kendi hareketleri (dock, bildirimler, modal, sağ tık menüsü) `motion/time.ts` ve `motion/utils.ts` üzerinden aynı merdivendedir: süreler `step(n)` (`motion/utils.ts`), eğriler `POINTS` (`motion/constants.ts`), yaylar `springForce(response(…))`. `springForce` motorun yayını (`period`, `damping`, `mass`) motion'ın `stiffness`/`damping`'ine çevirir; `SPRING.follow` (kaydırılan vurgu, segment pili) mürekkebin elle tepkisi, `SPRING.press` ışığın basması. Motorun dışındaki yaylar da aynı yoldan kurulur: afişin eğilmesi (`Tilt`) `springForce({ ...response(MATTER.paper, 0), period: step(1) })`, imlecin butondaki simgeyi çekmesi (`Magnet`) `springForce(response(MATTER.ink, 1))`; elle yazılmış `stiffness`/`damping` kalmadı.

## Parçanın sözleşmesi

Bir parça elemanının `opacity`, `transform`, `filter` ve `clip-path` özellikleri **motora aittir**. Elemanın kendi transform'u (ör. `-translate-x-1/2`) varsa, parçayı bir sarmalayıcıya koy.

## React kullanımı

```tsx
const { StageRoot, usePart, useSection, useAct, useStage } = bindScore(movie);

<StageRoot memory={`movie:${id}`}>
  <div {...usePart("backdrop")} className="absolute inset-0" />
  <h1 {...usePart("title")}>…</h1>
  {facts.map((fact, index) => (
    <li key={fact} {...usePart("facts", { index })}>
      …
    </li>
  ))}
  <section ref={useSection("reviews")}>…</section>
</StageRoot>;
```

- `usePart` şunları döndürür: `ref`, SSR'da doğru başlangıç görünümünü veren `style` ve `data-part`.
- `usePart` seçenekleri: `index`, `ready`, `carry`, `touch`, `forces`, `render`, `css`.
- `Section now` ve `Swap now`: bölüm ulaşılmayı beklemez, mount olur olmaz açılışın hemen arkasına sıralanır. Açılışın doğrudan devamı olan, ama kendi kapsamında yaşayan bölümler içindir (ana sayfanın öne çıkan filmi ve makaraları).
- **Strict mode:** iki kez mount edilmek sorun çıkarmaz. `halt()` sahneyi perde öncesine döndürür.

## Laboratuvar

`/lab/engine` ve `/lab/engine/b` yalnızca geliştirme ortamında açılır, production'da 404 döner. İki sayfa aynı partisyonu farklı tempo, renk ve yerleşimle oynar. Burada şunlar denenebilir:

- tempo ve yavaş çekim (`clock.rate`),
- açılışı yeniden oynatma ve ayrılış,
- postere tıklayıp diğer sayfaya geçme: ayrılış, devir ve renk geçişi birlikte,
- tekerlek sürücüsü, derinlik, satır bölme, canvas sahnesi, hover/press.

Partisyonun kâğıt üzerindeki zamanlaması da ekranda görünür.

## Sayfalara geçiş

### Durum

| Sayfa          | Durum       | Not                                                                               |
| -------------- | ----------- | --------------------------------------------------------------------------------- |
| Terms, Privacy | **Motorda** | `features/legal/view.tsx`; tempo −1; her bölüm kendi kapsamında (`Section`) gelir |
| Film, yorumlar | **Motorda** | `features/detail/motion.tsx`; aşağıdaki "Film ve kişi sayfası" notları            |
| Kişi           | **Motorda** | Film sayfasıyla aynı altyapı (`features/detail`)                                  |
| Ana sayfa      | **Motorda** | `features/home/motion.tsx`; aşağıdaki "Ana sayfa" notları                         |
| Hesap          | **Motorda** | `features/profile/motion.tsx`; aşağıdaki "Hesap sayfası" notları                  |
| Salonlar       | **Motorda** | `features/spotlights/shell.tsx`; Oscars, yönetmenler, Top 100                     |
| Dock yüzeyleri | **Motorda** | `ui/surface.tsx`; aşağıdaki "Dock yüzeyleri" notları                              |

`EngineProvider drive` uygulamanın kökünde: token'ları yazar, sayfa geçişlerinde rengi taşır, tekerleği sürer ve favicon'u odanın rengine boyar (`TintedFavicon`). Eski `SmoothScrollProvider`, `src/motion/stage`, `src/motion/scroll` ve `src/motion/scene` silindi.

### Bir sayfayı taşımak

1. Sayfanın özelliğinde bir `motion.tsx` (`"use client"`): `defineScore` ve `bindScore`.
2. Bileşenleri tek tek dışa aktar (`export const PageStage = bound.StageRoot`). Bir client modülde yapı bozma ile yapılan export'lar server component'lerden görünmez.
3. Server component'ten `PageStage`, `Part`, `Section`, `Text` ile yerleştir. Tekrar eden bölümler (`Section`) kendi kapsamlarını otomatik açar.
4. Sayfa `main`'ine `ui-scene` sınıfını ver, böylece etkileşimlerin CSS geçişleri açık olur.

### Kit

`src/motion/kit.tsx` (ve `marquee.tsx`, `expose.tsx`, `wall.tsx`), `bindScore`'un döndürdüğü nesnede skorun parça ve bölüm adlarıyla tiplenmiş halde. Her parça aynı kanunlarla çalışır: süresi parçanın maddesinden ve sayfanın temposundan gelir.

| Bileşen                      | Ne yapar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Nasıl cast edilir                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `Header`                     | Bölüm başlığı. Barın üzerinden tek bir ışık başı geçer: lamba yanar, isim basılır, çizgi ucunda kıvılcımla çizilir, aksiyonlar silinerek gelir. Geçiş, parçanın kendi varışıdır.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `{ matter: "ink", enter: "still" }` (çıkış ve derinlik CSS'le çalışmaya devam eder)                                               |
| `Bloom`                      | Film/kişi adı. Soldan sağa bir ışık süpürür (projeksiyon merceğinin parlaması), yazı onun arkasında bulanıklıktan yavaşça odağa gelir. Süpürme ve odak varışın zaman pencereleridir; katmanlara maske taşmasın diye pay verilir.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `{ matter: "ink", enter: "still" }`                                                                                               |
| `Marquee`                    | Sayfanın açıldığı başlık kartı: adı odanın ortasında, harflerin içinden sayfanın kendi resmi görünür. Kart perdeyi tutar (gelişir, dinlenir); perde kalkınca varışı dalıştır: kamera adın içine girer, harfler açılır ve geçer, harflerdeki resim backdrop'un gelişen haline (bulanıklık, parlaklık, ölçek) devredilir. Kart tek bir canvas'tır (harfler, harflere kesilmiş resim, kenar ışığı, sayfanın kenarları tek geçişte); tarayıcı yalnızca bitmiş canvas'ı soluklaştırır ve bulandırır. Resim backdrop'un çerçevesinde durur ve `edges` (`SIDE_COVER`, `BOTTOM_COVER`) dalışla alınır; kart için hafif kopya (`w1280`) kullanılır. Kart `quiet` olana, yani sayfanın kendi resmi (GL yüklemesi, sayfanın en ağır işi) kurulana kadar gelişmez: ağır iş kartın hareketini düşürmez. Harfler odanın ara tonuna biraz çekilir (beyaz ya da siyah bölgede de resimden kesildiği görünsün), kenar ışığı ambient modülünün renklerindendir (`--ambient-vibrant-90`, `--ambient-dominant-70`). Kart her film ve kişi sayfasında vardır; yalnızca azaltılmış hareket, gelmeyen resim ya da backdrop'u olmayan kişi sayfasında yoktur. Sayfa çoğunlukla başka bir sayfanın aşağısından açıldığı için kart, bir el (tekerlek, tuş, dokunuş) tutana kadar sayfayı en üstte tutar. Kart durduğu sürece sayfa elle gösterilemez, basılamaz, seçilemez (katman imleci alır; dock üstündedir); bir el (tekerlek, tuş, dokunuş) beklemeyi bitirir. | `{ matter: "plate", enter: "still", leave: "still" }`; açılışta backdrop'la aynı vuruşta, ardından `{ rest: 1, with: "marquee" }` |
| `Expose`                     | Işık bandıyla basılan metin. Çıkışta aynı bant baskıyı yakarak götürür. `hover` bandı bir kez, daha hızlı ve soluk tekrar oynatır.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Herhangi bir madde; fiilleri yazılmaz, bandın hızı varıştır                                                                       |
| `Count`                      | Parça gelirken sayı sayar ve parçayla birlikte iner. `hover` expo eğrisiyle yeniden sayar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Herhangi bir madde (`light` önerilir)                                                                                             |
| `Swap`                       | Yerinde değişen içerik (filtre, sekme, sayfa). `id` değişince eski içerik kendi fiilleriyle çıkar, yenisi bölümü karanlıktan oynar; kutu eski yüksekliği koruyup yenisine yerleşir.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `cue`: içeriğin bölümü                                                                                                            |
| `Deck`                       | Gizlenince de bağlı kalan görünümler. Geçişte gösterilen görünüm çıkar, sıradaki hemen oynar. `onSwitch` ile sayfa desteyi görüş alanına getirebilir.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `cue`: görünümün bölümü                                                                                                           |
| `WallStage`, `useWall`       | Sayfanın önüne asılan duvar (galeri). Sayfa parçalarının kendi çıkış fiilleriyle geri çekilir, pencere başa döner, duvar bölümünü oynar; kapanınca sayfa açan elemanın yanına geri gelir. Esc kapatır.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `cue`: duvarın bölümü                                                                                                             |
| `Room`                       | Sayfanın ışığı: tint yıkaması, ekran greni, lens camı, salon ışıkları. Hareketi yok; `--tint`'i okur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                 |
| `useShowing`, `useHouseDown` | Modal gibi önde duran bir şey varken salon ışıkları φ⁻¹ karartıya iner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                                                                 |

Fiillere `door` eklendi: alttan yukarı açılan bir kapı ve zoom'dan geri oturan resim (eski `Develop`). Parça, taşmayı kesen bir çerçevenin içinde olmalı. Görünüm artık dört kenardan kesilebiliyor (`clipTop/Right/Bottom/Left`); farklı kuvvetlerin kesimleri büyük olanı alır.

`Swap`, `Deck` ve `WallStage` kendi kapsamlarına sahiptir: içlerine konan bir `Section` yeni kapsam açmaz, onlarınkine katılır.

**Kapsamlar iç içedir.** Bir kapsam, bir yol gibi üst kapsamının altındadır (`duvar/swap`, `görünüm/bölüm`; `childScope`, `inScope`). Bir kapsama yapılan her şey (`dismiss`, `recede`'in koruduğu kapsam, `reset`) altındaki her şeye de yapılır. Böylece duvarın içindeki bir `Swap` duvarla birlikte öne çıkar ve onunla gider; bir `Section`, başka bir bölümün içinde onun çocuğu olur. Bir `cue` ise yalnızca kendi kapsamının parçalarını oynatır.

`Deck`'in iki biçimi var:

- `cue` ile: her görünüm tek bir bölümdür ve desteye aittir. Geçilen görünüm hemen oynar.
- `cue` olmadan: her görünüm kendi bölümlerinden oluşan bir sütundur (film sayfasının Genel bakış / Ödüller sütunu). Görünüm bütünüyle çıkar. Geri dönülünce `reset` ile karanlığa alınır ve bölümleri, ilk ziyaretteki gibi, ulaşıldıkça yeniden oynar (`ScopeGeneration` bölümlerin pencereyi yeniden izlemesini sağlar).

Generic bileşenler: `StagePart` ve `StageSection`, parça adlarını düz string olarak alır. Bunlar, birden fazla sayfanın paylaştığı bileşenler içindir (ör. `MoviePopularLists`, `MovieSocialProof`).

Sahne üç yeni fiil kazandı:

- `dismiss(scope)`: bir kapsamın parçaları kendi başına çıkar, sayfanın geri kalanı fark etmez.
- `recue(section, scope)`: kapsam bölümünü karanlıktan yeniden oynar.
- `reset(scope)`: kapsam (altındakilerle birlikte) hiç ulaşılmamış gibi karanlığa döner. Kim cue ederse o zaman oynar.
- `recede(keep)` / `restore()`: sayfa ayrılmadan geri çekilir ve geri gelir; çekilmişken gelen yeni parçalar da çekilmiş başlar.

`Grade` artık `--light` da yayınlar: karanlık odada beyaz, renk geldikçe tint. Kit ışıkları bunu kullanır.

#### Eski bileşenlerin karşılıkları

| Eski                                 | Motorda                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Stage`, `Sequence`, `Layer`, `Body` | `StageRoot`, açılış beat'leri, çıkış fiilleri                                                |
| `Backdrop`                           | `plate` + `depth`, resim yüklenene kadar `ready: false`                                      |
| `Title`, `Words`, `Hairline`, `Line` | `Text`, `wipe`                                                                               |
| `Cascade`, `Item`, `Beat`            | `Section` + `Part index`                                                                     |
| `Header`, `Expose`, `Count`, `Swap`  | Kit'teki aynı adlı bileşenler                                                                |
| `Carousel`                           | `@/ui/media` `Carousel part="…"`: her slayt bir parça, oklar ilk slayt inince                |
| `Tile`, `Develop`                    | `door` fiili                                                                                 |
| `StageAction`                        | `@/ui/button` `ActionButton` + sayfanın `Part`'ı                                             |
| `Picture` (`ArtworkPoster`)          | `ArtworkPrint part`: `door` + `Tilt` (eğilme, parlama, folyo)                                |
| `useRoom().setLead`                  | Sayfanın `grade`'i (film: `useLead`)                                                         |
| `ViewDeck`                           | `Deck`                                                                                       |
| `Wall`, `Hung`, `useWall`            | `WallStage`, `useWall`                                                                       |
| `Frame`, `RoomGrain`, `HouseLights`  | `Room`                                                                                       |
| `useShowing` (effects)               | `useShowing` (kit)                                                                           |
| Carry, grade, favicon tonu           | `carry`, `grade`, `TintedFavicon` (odanın hedef rengi)                                       |
| `Projection` (WebGL)                 | Olduğu gibi, `plate` bir parçanın içinde (`ready` = `onReady`); `useScene`'e taşınması sonra |
| `SurfaceScene`, `Cascade` (dock)     | `SurfaceStage`, `SurfacePart`, `SurfaceSwap` (`@/ui/surface`)                                |

Laboratuvar: `/lab/kit` (yalnızca geliştirme). Her kit parçası orada denenebilir.

### Film ve kişi sayfası

İki sayfa tek altyapıdır: `features/detail`. Projeksiyon, oda, başlık, yapışkan kenar sütunu (afiş, butonlar, künye), görünüm geçişi, ara kartı, galeri duvarı ve ödüller ortaktır (`DetailLayout`, `DetailSidebar`, `DetailViews`, `DetailBackdrop`, `DetailIntermission`, `DetailAwards`, `GalleryWall`). Sayfaya ait olan yalnızca sağ sütundaki bölümlerdir.

`features/detail/motion.tsx` içindeki score:

- **Açılış:** başlık kartı (`marquee`) ve projeksiyon (backdrop, `plate`, `depth 1`, resim hazır olana kadar bekler) aynı vuruşta: harflerin içine dalılırken resim arkada gelişir → (kart varsa) bir es → başlık → çizgi → tagline ya da kişinin mesleği (`role`) → overview, afiş ve istatistikler birlikte → butonlar, sosyal bağlantılar ve "Read more" (`link`) → künye satırları (etiket, değer, çizgi). Bir sayfada olmayan parça diğerinin zaten çaldığı bir vuruşa katılır; motor boş vuruşu da beklediği için yeni vuruş eklemek film sayfasını yavaşlatır. Karta ait es bu yüzden `with: "marquee"` ile koşulludur: kartı olmayan sayfa (yorumlar, backdrop'u olmayan kişi) o beklemeyi ödemez.
- **Bölümler:** her `Heading` bir bölümün başlığıdır. Sekmeyle değişen içerik (oyuncular, galeri, videolar, filmografi) kendi `Swap` bölümüdür. Öneriler, yorum özeti, listeler ve ödüller başlıklarıyla birlikte tek bir bölümdür.
- **Kişi bölümleri:** kariyer (`career`: başlık, okunan yıl ve eksenden açılan çubuklar, sonra yıllar), filmografi (`board` + `tiles`), galeri (`shelf` + `slides`), zaman çizelgesi (`timeline`: başlık ve omurga; her yıl kendi `year` bölümü: damga, sonra filmler). Omurganın dolumu motorun `scroll` sinyalinden okunur.
- **Oda:** rengi, sırayla şunlardan alınır: elin üzerinde durduğu still, projeksiyona alınan still (film), sayfanın resmi: filmin backdrop'u ya da kişinin backdrop'u, yoksa fotoğrafı (`MovieStage`, `PersonStage`). Kaydırınca arka plana renk basan eski `Ambient` kişi sayfasından kalktı.
- **Galeri duvarı:** `DetailWallStage`. Hangi setle açılacağı `useWallSet`'te tutulur.
- **Devir yok:** sayfa her zaman başlık kartıyla açıldığı için afiş artık sayfalar arasında uçmaz; `posterCarry` kalktı.

Geçiş dönemi notları:

- Ödül verisi yerel ortamda hiçbir filmde yok. Bu yüzden Genel bakış / Ödüller geçişi film sayfasında denenmedi; aynı `Deck` biçimi `/lab/kit`'teki "Columns" örneğinde denendi.

### Ana sayfa

`features/home/motion.tsx` içindeki score:

- **Açılış:** yalnızca projeksiyon (öne çıkan filmin backdrop'u, `DetailBackdrop` ile aynı projeksiyon; resim hazır olana kadar bekler).
- **Öne çıkan film:** `feature` bir `Swap now` bölümüdür: gerekçe ve başlık, sonra künye ve logline, sonra "Open film" ve sosyal satır. Döngü (9 sn) ya da makaraya tıklama `id`'yi değiştirir; eski kelimeler kendi fiilleriyle çıkar, yenileri karanlıktan gelir. Yanındaki makaralar (`reels`) `Section now` ile hemen arkasından gelir. İkisi de kendi kapsamında olduğu için açılışa yazılamaz; `now` olmasaydı ekranın altında kalan bir hero, kaydırılana kadar karanlıkta beklerdi.
- **Bölümler:** her satır bir başlık ve kendi parçalarıdır: `pulse` (selam, sonra sayan istatistikler), `row` (afiş satırları), `shelf` + `slides` (sinemadaki filmler, sekmeyle değişen `Swap`), `reviews`, `rising`, `lists`, `members`, `join` (çizgi silinerek gelir, sonra davet ve maddeler).
- **Oda:** rengi öne çıkan filmin backdrop'undan alır, film değiştikçe geçer (`HomeStage`, `useHomeLead`). Eski `Ambient` yıkaması kalktı; oda `Room`'dur.
- **Devir yok:** afiş satırları film sayfasına afiş uçurmaz (`carried` kalktı); film sayfası başlık kartıyla açılır.

Not: aynı dikkat kuyruğu, aşağıda sırada bekleyen bölümler varken bir film değişimini de onların arkasına koyar. Sayfa başındayken değişim anında oynar.

### Hesap sayfası

Hesap sayfası bir Next layout'udur (`/account/[username]/…`): kahraman, sekmeler ve istatistikler bütün sekmelerde aynı sahnededir. `features/profile/motion.tsx` içindeki score:

- **Açılış:** üyenin arka planı (`plate`, `depth 1`, resim yüklenene kadar bekler), sonra avatar (`develop`) ve isim (`Text`, `mask`), sonra kullanıcı adı / katılma / gizli satırı, en son sekmeler, "followed by" ve istatistik satırı birlikte.
- **Görünüm:** sekmenin sayfası tek bir `view` parçasıdır, kendi kapsamında (`AccountView`). Açılışın hemen arkasından gelir.
- **Sekme geçişi:** üyenin kendi yolları içinde kalan bir yolculuk sayfadan ayrılmaz (`StageRoot leaves`). Yol değişince `view` kapsamı `recue` ile karanlığa döner ve yeniden oynar; kahraman yerinde kalır. Burada `Swap` kullanılamaz: layout'un `children`'ı eski sayfa değil, router'ın yuvasıdır. Yol değiştiğinde içinde zaten yeni sayfa vardır, tutulacak eski içerik yoktur.
- **Oda:** arka plan, yoksa avatar. Framework'ün ambient paleti (`useAmbientTheme`) film ve kişi sayfalarındaki gibi ayrıca çalışmaya devam eder.
- Eski `src/motion/scene` (`Scene`, `HeroStage`, `CinemaTitle`, `Reveal`, `RowItem`) yalnızca bu sayfa kullanıyordu; silindi. Avatarın üzerinden geçen parıltı motorda yok, avatar `develop` ile gelir.

Motor: `sampleTint` okuyamadığı bir resmi bir kez de kendi adresiyle (`?tint`) dener. Sayfa aynı resmi CORS'suz bir `<img>` ile aynı anda yüklerken önbellekten başlıksız yanıt gelebiliyordu ve oda renksiz kalıyordu.

### Salon sayfaları

Oscars, yönetmenler ve Top 100 tek bir küçük score'u paylaşır (`features/spotlights/shell.tsx`, `SalonStage`): karanlık oda (`Room black`, `grade={null}`), WebGL sahnesi (`scene`) ve üstündeki sayfa katmanı (`chrome`: yıl kadranı, yönetmen adları ve filmleri, Top 100 sayacı).

- **Varış sayfanın kendisinindir.** Altının dökülmesi, portrenin basılıp akması, duvarın yanması her sayfanın kendi koreografisidir; ikisi de `enter: "still"` ile hemen oradadır. Motor bunlara yalnızca çıkışı verir: sayfa ayrılırken sahne ve katman `fade` ile söner, route sahne `gone` olunca gelir.
- `chrome` yalnızca `fade` ile çıkar: üzerine bir `filter` ya da `transform` yazılsaydı içindeki `fixed` paneller ona göre konumlanırdı.
- **Sahneler motorun saatinde.** Üç renderer da (`Foundry`, `Portrait`, `Wall`) kendi `requestAnimationFrame` döngüsü yerine `mountSpotlight` (`features/spotlights/shell.tsx`) ile bir `mountScene` parçası olarak çalışır: kareler motorun saatinden gelir (boşta durur, `clock.rate` ile yavaşlar, kare sınırı motorunki). Renderer'lar kendi zaman tabanlarını (`performance.now()`) korur; yalnızca `dt` motordan gelir. Her renderer kendi piksel sınırını (1.5 / 1.75 / 2) `pixelRatio` olarak verir, böylece motorun boyutlandırması renderer'ınkiyle aynıdır.
- Motor: `SceneSetup` artık ikinci bir argüman alır, `wake`. Kendi durumu değişen bir renderer (resim yüklendi, yeni yıl seçildi) onunla bir kare daha ister. Bakışı, scroll'u ya da imleci değişmeyen bir sahne başka türlü yeniden çizilmezdi.
- Sahne, view'in kendi effect'inde kurulur (`useAnyStage` + `mountSpotlight`), `useScene` ile değil: kurulum ref'lere ve `useEffectEvent`'lere dokunuyor, React Compiler da bunu ancak bir effect içinde kabul ediyor. Bu yüzden her view'in dışa aktarılan bileşeni yalnızca `SalonStage`'i kurar; asıl sayfa onun içindedir.
- Top 100 filme `router.push` ile gidiyordu; bu framework'ün navigasyon bekletmesini atladığı için sayfa ayrılmadan kesiliyordu. Artık `useDockActions().navigate` ile gidiyor.
- Eski `size(n)` / `EASE` token'ları `step(n)` / `POINTS` ile değiştirildi (yıl kadranı, kazananlar dizini, ödüller görünümü); değerler aynı. `imagesReady` spotlights'a taşındı, `opening.ts` silindi.

### Dock yüzeyleri

Bir dock yüzeyi sayfa değildir: sayfanın önünde, kendi panelinde açılır ve kapanır. Motor bunun için `SurfaceRoot` verir (`bindScore`'un döndürdüğü nesnede, `StageRoot`'un yanında). Açılışını mount olur olmaz oynar; navigasyonu bekletmez, tekerleğin temposunu ve odanın rengini sayfaya bırakır.

Bütün yüzeyler tek bir score'u paylaşır (`ui/surface.tsx`, `@/ui/surface`'ten `SurfaceStage`, `SurfacePart`, `SurfaceSwap`):

- **Tempo −2.** Yüzey elde tutulan bir araçtır, sahne değil. Bir sayfadan iki basamak hızlı oynar.
- **Açılış:** dock paneli açılırken kısa bir bekleme (`{ rest: 0 }`, tempo −2'de 0.19 sn, eski `SURFACE_LEAD`), sonra yüzeyin alanları ve satırları (`item`, `paper`) DOM sırasıyla.
- **Değişen içerik bir `SurfaceSwap`'tir.** Yüklenen liste, başka bir kategori, başka bir bölge: eski içerik kendi fiiliyle çıkar, yeni satırlar (`row`) karanlıktan sırayla gelir, kutu eski yüksekliği koruyup yenisine yerleşir. Yükleniyor / boş / hata durumları `note` (`glass`) parçasıdır ve satırların yerine aynı vuruşta gelir. Yüzeyin içindeki her swap `now`'dır: dock ekranın altında durduğu için bölüm tetikleyicisinin "ekranın φ⁻¹'ine gelme" kuralı orada hiç gerçekleşmezdi.
- Taşınanlar: ayarlar (genel bakış satırları), liste formu, sıralama, seçici (listeler bir swap), yorum editörü, kişi biyografisi, "Where to watch" (durum ve kategori/bölge iki iç içe swap). Hesap, giriş, bildirim ve sosyal yüzeyleri daha önce de hareketsiz açılıyordu; öyle kaldı.
- Eski `Item from="left|right|scale"` yönleri yok: yüzeyde her şey maddesinin fiiliyle gelir.

### Kök temizliği

- `EngineProvider drive` açık; eski `SmoothScrollProvider` (Lenis benzeri motor) silindi. Projeksiyonun bulanıklaşması ve çizgileri artık motorun `scroll` sinyalinden okunur (aynı karede, hızıyla).
- `effects`'ten eski sisteme ait olanlar silindi: `Carry`/`useLanding` (shared-image; devri motorun `carry`'si yapıyor), `Room` (crossfade-backdrop), `RoomGrain`, `useBeam`, eski `useShowing`/`useHouseDown` (kit'tekiler kullanılıyor). `optical-inset` ve `ArtworkPoster` kullanılmıyordu, silindi. `crt` ve `idle-screen` `POINTS` kullanır.
- `globals.css`'ten eski `Cascade`'in scroll'la sönme kuralı (`[data-exit]`, `cine-exit`) ve kullanılmayan `film-beam`, `ui-drift` sınıfları silindi.

### Sıra

1. ~~Kit~~ (tamam).
2. ~~Film sayfası~~, ~~kişi sayfası~~ (tamam).
3. ~~Ana sayfa~~, ~~hesap sayfası~~ (tamam).
4. ~~Salon sayfaları~~ (tamam).
5. ~~Dock yüzeyleri~~ (tamam).
6. ~~Kök: `drive`, eski scroll ve stage'in silinmesi, CSS süreleri `--step-*`'te~~ (tamam).

Açık kalanlar: `Projection`'ın `useScene`'e taşınması (şu an bir `plate` parçasının içinde kendi döngüsüyle çiziyor) ve yüzeylerdeki `scrollWithin`. Bu yardımcı tekerleği React'in pasif dinleyicisinde `preventDefault` etmeye çalışıyor ve konsola uyarı yazıyor; motor bu kutuları zaten sürmediği için gerekip gerekmediği ayrıca denenmeli.

Testler (25 davranış testi) şu an projenin dışında duruyor, çünkü projede test çalıştırıcısı yok.
