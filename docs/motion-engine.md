# Guffin Motion Motoru

`src/motion/engine/`: sıfırdan yazılmış, mevcut `stage`/`scene`/`scroll` kodundan bağımsız motion motoru. Henüz hiçbir sayfa bu motoru kullanmıyor.

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

| Dosya       | Sorumluluk                                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ladder.ts` | Zaman merdiveni: `step(n) = 0.5 · φⁿ`, tempo, `trail` (altın gecikme), `reach` (mesafe merdiveni)                                                                |
| `curve.ts`  | Cubic-bezier çözücü ve eğri ailesi (fade, silk, pour, expo, glide, fall)                                                                                         |
| `spring.ts` | Kapalı formda çözülen yay: her kare uzunluğunda kesin sonuç verir, yeniden hedeflenince hız korunur                                                              |
| `matter.ts` | Madde tablosu: basamak, kütle, sönüm, eğri, varsayılan fiiller                                                                                                   |
| `verbs.ts`  | Fiiller: hareketin _şekli_ (ilerleme → görünüm). Süre içermez.                                                                                                   |
| `look.ts`   | Görünüm cebiri: her kuvvet bir "gölge" ekler, gölgeler harmanlanıp tek seferde yazılır                                                                           |
| `clock.ts`  | Tek saat: her karede okuma, güncelleme ve çizim fazları; boşta durur; topluca yavaşlatılabilir                                                                   |
| `value.ts`  | Saatte hareket eden sayı (tween ya da yay); kesilince olduğu yerden, olduğu hızla devam eder                                                                     |
| `engine.ts` | Saat ve duyular: scroll, viewport, pointer, reduced motion, layout                                                                                               |
| `fields.ts` | Kuvvet alanları: derinlik (parallax, karartma, odak kaybı) ve sürüklenme (imlece eğilme)                                                                         |
| `score.ts`  | `defineScore`, `plan` (partisyonun kâğıt üzerindeki zamanlaması)                                                                                                 |
| `stage.ts`  | Çalışma zamanı: dikkat kuyruğu, yaşam döngüsü, çizim                                                                                                             |
| `touch.ts`  | Kuvvet arayüzü ve dokunuş: hover/press yayları, maddeye göre                                                                                                     |
| `scroll.ts` | Scroll sürücüsü: tekerlek bir kuvvet, sayfa merdivendeki bir yayla takip eder                                                                                    |
| `carry.ts`  | Devir: basılan resim sayfalar arasında uçar, yeni sayfadaki eşine iner                                                                                           |
| `tint.ts`   | Oda rengi: resimden ton okuma, OKLCH'de çapraz geçiş, `--tint`                                                                                                   |
| `text.ts`   | Metni kelime/satır kardeşlerine bölme                                                                                                                            |
| `scene.ts`  | Canvas/WebGL parçası: CSS yerine görünümü çizen sahne                                                                                                            |
| `tokens.ts` | Merdivenin CSS değişkenleri, `--tempo` ile ölçeklenir                                                                                                            |
| `react.tsx` | `EngineProvider`, `bindScore` → `StageRoot`, `usePart`, `useSection`, `useScene`, `Text`, `useAct`, `useStage`; ayrıca `useTouch`, `useCarry`, `useScrollDriver` |

## Kanunlar

### 1. Zaman: tek merdiven

- Her süre `step(n) = 0.5 · φⁿ` merdivenindeki bir basamaktır.
- Sayfa yalnızca **tempo** seçer (−2…+2), yani merdivende kaç basamak kayacağını.
- Merdiven geometrik olduğu için tempo tüm süreleri aynı oranda büyütür ya da küçültür. İki parça arasındaki oran asla bozulmaz.

| n   | −2   | −1   | 0    | 1    | 2    | 3    | 4    |
| --- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| sn  | 0.19 | 0.31 | 0.50 | 0.81 | 1.31 | 2.12 | 3.43 |

Tekrar ziyaret edilen bir sayfa bir basamak hızlı oynar (`REVISIT_PACE = −1`, `memory` prop'u ile).

### 2. Madde: süre değil, ağırlık

Parça süre söylemez, neyden yapıldığını söyler. Motor süreyi maddeden türetir: varış süresi `step(rung + tempo)`.

| Madde   | Basamak | Varış  | Kütle | Sönüm | Giriş   | Çıkış | Örnek                |
| ------- | ------- | ------ | ----- | ----- | ------- | ----- | -------------------- |
| `light` | 1       | 0.81 s | φ⁻²   | 1     | glow    | fade  | etiket, künye, sayı  |
| `glass` | 1       | 0.81 s | φ⁻¹   | 1     | clear   | fog   | panel, overlay       |
| `ink`   | 2       | 1.31 s | φ⁻¹   | 0.9   | rise    | fade  | başlık, metin        |
| `paper` | 2       | 1.31 s | 1     | 0.86  | lift    | sink  | kart, poster, satır  |
| `metal` | 3       | 2.12 s | φ³    | 0.72  | settle  | sink  | heykelcik, ağır obje |
| `plate` | 4       | 3.43 s | φ²    | 1     | develop | cool  | backdrop, fotoğraf   |

- **Çıkış:** varıştan iki basamak kısa sürer ve hiçbir zaman `step(2)`yi aşmaz. Sayfa, geldiğinden hızlı ayrılmalıdır.
- **Tepki:** imleç ya da sürükleme gibi bir "el" dokunduğunda parça, aynı maddenin varışından üç basamak hızlı bir yayla cevap verir. Yayın periyodu da merdivendedir.
- **Kütle:** itmeye karşı direnci belirler (`Value.push`).

### 3. Fiil: hareketin şekli

Fiil bir fonksiyondur: ilerlemeyi alır, görünümü döndürür. Süre içermez.

- **Giriş fiilleri:** `glow`, `rise`, `lift`, `clear`, `develop`, `settle`, `wipe`, `still`.
- **Çıkış fiilleri:** `fade`, `sink`, `fog`, `cool`, `burn`, `still`.
- **Işık kuralı:** ışık yolun φ⁻¹'inde tamamlanır. Bir parça yerine oturmadan önce okunur hale gelir.
- **Değerler de merdivenden gelir.** Mesafeler `reach(n) = 24 · φⁿ` px. Bulanıklık ve parlaklık φ'nin kuvvetleridir.

### 4. Dikkat: tek kuyruk

- **Sıra:** bir sahnede aynı anda tek bir "beat" dikkat ister.
- **Bindirme:** sonraki beat, öncekinin **iki basamak içinde** başlar (`CUE_LEAD = 2`), yani göz onu bulduğunda, o oturduğunda değil. Bir `plate`'in (3.43 s) ardından gelen parça 1.31 s'de başlar.
- **Kardeşler:** aynı parçanın kopyaları (liste satırları, kelimeler) `trail` ile gelir. Her boşluk bir öncekinin φ⁻¹'idir. Sayı ne olursa olsun hepsi, parçanın bir basamak altındaki pencereye sığar.
- **Hazır olma:** `usePart(name, { ready: false })` olan bir parça hazır olana kadar beat'i bekletir, en fazla `PATIENCE = step(3)` kadar.
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

### 8. Dokunuş: aynı madde, elin hızında

- Bir el (hover, odak, basma) parçaya bir **kuvvet** olarak girer; kuvvetin gölgesi alanlardan sonra harmanlanır.
- Hover maddenin tepki yayıyla gelir; basma bir basamak daha hızlı iner, hover hızında bırakır.
- Fiiller: `press` (φ⁻⁷ kadar küçülür), `lift` (`reach(−3)` yükselir, φ⁻⁸ büyür), `glow` (φ⁻⁴ parlar).
- Parça için `usePart(name, { touch: "lift" })`. Parça olmayan bir buton için `useTouch({ verb, matter })`; bu yalnızca `transform` ve `filter` yazar.
- Klavye: `:focus-visible` hover sayılır, Enter basmadır.

### 9. Scroll: tekerlek bir kuvvettir

- `EngineProvider drive` ile motor tekerleği sürer. Her tekerlek adımı hedefi kaydırır; sayfa onu sönümü kritik bir yayla izler. Periyot `step(1 + tempo)`: ağır sayfa ağır kayar.
- Sayfanın temposu sürücüye `StageRoot` tarafından verilir ve sayfa ayrılınca geri alınır.
- Tarayıcının kendi kaydırmaları (klavye, scrollbar, dokunmatik, çapa) **benimsenir**, hiçbir zaman engellenmez.
- İç içe kaydırılabilir alanlar, `data-scroll-native`, kilitli sayfa (`overflow: hidden`), yatay ve Ctrl/⌘ tekerlek sürülmez.
- Kaydırma sürerken `<html data-scrolling>`. Reduced motion'da sürücü devre dışıdır.
- Motorun `scroll` değeri sürücüden aynı karede gelir; derinlik alanı gecikmesiz çalışır.

### 10. Navigasyon: ayrılış sözleşmesi

- `StageRoot` framework navigasyonuna bir hold kaydeder. Başka bir path'e giden her yolculukta `stage.leave()` oynar; route ancak sahne `gone` olunca istenir.
- Aynı sayfada sorgu ya da hash değişimi ayrılış sayılmaz (`leaves` prop'u ile değiştirilebilir).
- Yolculuk iptal olursa (`trip.signal`) `stage.stay()`: parçalar bulundukları yerden geri gelir, partisyon kaldığı yerden devam eder.

### 11. Devir: bir resim iki sayfa arasında

- `usePart("poster", { carry: "poster" })` parçayı hem taşınabilir hem de alıcı yapar. Parça olmayan bir kaynak için `useCarry(key)`.
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

| Sayfa          | Durum         | Not                                                                                 |
| -------------- | ------------- | ----------------------------------------------------------------------------------- |
| Terms, Privacy | **Motorda**   | `features/legal/motion.tsx`; tempo −1; her bölüm kendi kapsamında (`Section`) gelir |
| Film, yorumlar | **Motorda**   | `features/movie/motion.tsx`; aşağıdaki "Film sayfası" notları                       |
| Diğer sayfalar | Eski sistemde | Sıradaki: kişi sayfası                                                              |

`EngineProvider` uygulamanın kökünde. Token'ları yazar, sayfa geçişlerinde rengi taşır. Tekerleği henüz sürmüyor (`drive` kapalı), çünkü eski sayfalar hâlâ eski SmoothScroll'u kullanıyor.

### Bir sayfayı taşımak

1. Sayfanın özelliğinde bir `motion.tsx` (`"use client"`): `defineScore` ve `bindScore`.
2. Bileşenleri tek tek dışa aktar (`export const PageStage = bound.StageRoot`). Bir client modülde yapı bozma ile yapılan export'lar server component'lerden görünmez.
3. Server component'ten `PageStage`, `Part`, `Section`, `Text` ile yerleştir. Tekrar eden bölümler (`Section`) kendi kapsamlarını otomatik açar.
4. Sayfa `main`'ine `ui-scene` sınıfını ver, böylece etkileşimlerin CSS geçişleri açık olur.

### Kit

`src/motion/engine/kit/`, `bindScore`'un döndürdüğü nesnede skorun parça ve bölüm adlarıyla tiplenmiş halde. Her parça aynı kanunlarla çalışır: süresi parçanın maddesinden ve sayfanın temposundan gelir.

| Bileşen                      | Ne yapar                                                                                                                                                                                               | Nasıl cast edilir                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Header`                     | Bölüm başlığı. Barın üzerinden tek bir ışık başı geçer: lamba yanar, isim basılır, çizgi ucunda kıvılcımla çizilir, aksiyonlar silinerek gelir. Geçiş, parçanın kendi varışıdır.                       | `{ matter: "ink", enter: "still" }` (çıkış ve derinlik CSS'le çalışmaya devam eder) |
| `Expose`                     | Işık bandıyla basılan metin. Çıkışta aynı bant baskıyı yakarak götürür. `hover` bandı bir kez, daha hızlı ve soluk tekrar oynatır.                                                                     | Herhangi bir madde; fiilleri yazılmaz, bandın hızı varıştır                         |
| `Count`                      | Parça gelirken sayı sayar ve parçayla birlikte iner. `hover` expo eğrisiyle yeniden sayar.                                                                                                             | Herhangi bir madde (`light` önerilir)                                               |
| `Swap`                       | Yerinde değişen içerik (filtre, sekme, sayfa). `id` değişince eski içerik kendi fiilleriyle çıkar, yenisi bölümü karanlıktan oynar; kutu eski yüksekliği koruyup yenisine yerleşir.                    | `cue`: içeriğin bölümü                                                              |
| `Deck`                       | Gizlenince de bağlı kalan görünümler. Geçişte gösterilen görünüm çıkar, sıradaki hemen oynar. `onSwitch` ile sayfa desteyi görüş alanına getirebilir.                                                  | `cue`: görünümün bölümü                                                             |
| `WallStage`, `useWall`       | Sayfanın önüne asılan duvar (galeri). Sayfa parçalarının kendi çıkış fiilleriyle geri çekilir, pencere başa döner, duvar bölümünü oynar; kapanınca sayfa açan elemanın yanına geri gelir. Esc kapatır. | `cue`: duvarın bölümü                                                               |
| `Room`                       | Sayfanın ışığı: tint yıkaması, ekran greni, lens camı, salon ışıkları. Hareketi yok; `--tint`'i okur.                                                                                                  | —                                                                                   |
| `useShowing`, `useHouseDown` | Modal gibi önde duran bir şey varken salon ışıkları φ⁻¹ karartıya iner.                                                                                                                                | —                                                                                   |

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
| `Carousel`                           | `@/ui` `Carousel part="…"`: her slayt bir parça, oklar ilk slayt inince                      |
| `Tile`, `Develop`                    | `door` fiili                                                                                 |
| `StageAction`                        | `@/ui` `ActionButton` + sayfanın `Part`'ı                                                    |
| `Picture` (`ArtworkPoster`)          | `ArtworkPrint part carry`: `door` + `Tilt` (eğilme, parlama, folyo)                          |
| `useRoom().setLead`                  | Sayfanın `grade`'i (film: `useLead`)                                                         |
| `ViewDeck`                           | `Deck`                                                                                       |
| `Wall`, `Hung`, `useWall`            | `WallStage`, `useWall`                                                                       |
| `Frame`, `RoomGrain`, `HouseLights`  | `Room`                                                                                       |
| `useShowing` (effects)               | `useShowing` (kit)                                                                           |
| Carry, grade, favicon tonu           | `carry`, `grade` (favicon henüz yok)                                                         |
| `Projection` (WebGL)                 | Olduğu gibi, `plate` bir parçanın içinde (`ready` = `onReady`); `useScene`'e taşınması sonra |
| `SurfaceScene` (dock yüzeyleri)      | Sonra                                                                                        |

Laboratuvar: `/lab/kit` (yalnızca geliştirme). Her kit parçası orada denenebilir.

### Film sayfası

`features/movie/motion.tsx` içindeki score:

- **Açılış:** projeksiyon (backdrop, `plate`, `depth 1`, resim hazır olana kadar bekler) → başlık → çizgi → tagline → overview, afiş ve istatistikler birlikte → butonlar → künye satırları (etiket, değer, çizgi).
- **Bölümler:** her `Heading` bir bölümün başlığıdır. Sekmeyle değişen içerik (oyuncular, galeri, videolar) kendi `Swap` bölümüdür. Öneriler, yorum özeti, listeler ve ödüller başlıklarıyla birlikte tek bir bölümdür.
- **Oda:** rengi, sırayla şunlardan alınır: elin üzerinde durduğu still, projeksiyona alınan still, filmin backdrop'u (`MovieStage`).
- **Galeri duvarı:** `MovieWallStage`. Hangi setle açılacağı `useWallSet`'te tutulur.
- **Devir:** öneri afişleri `posterCarry(id)` anahtarıyla sunulur; yeni film sayfasındaki afiş aynı anahtarla alır.
- **Paylaşılan parçalar:** `ArtworkPrint`, `Carousel`, `ActionButton` ve `Tilt` kişi sayfası için de hazır.

Geçiş dönemi notları (kişi sayfası taşınınca kalkacak):

- Kişi sayfası hâlâ eski `GalleryWall` (`movie/components/gallery-wall.tsx`), `ArtworkPoster` ve `StageAction`'ı kullanıyor.
- Eski sayfalardan (kişi, ana sayfa) film sayfasına giden afiş uçuşu inmez; uçan resim süresi dolunca söner. Motordaki sayfalar arasında devir çalışıyor.
- Eski `useShowing` artık motorun salon ışığını sayıyor; iki sistem aynı ışığı paylaşıyor.
- Dock'taki "Where to watch" yüzeyi hâlâ eski sahne bileşenlerini kullanıyor (yüzeyler en sonda).
- Ödül verisi yerel ortamda hiçbir filmde yok. Bu yüzden Genel bakış / Ödüller geçişi film sayfasında denenmedi; aynı `Deck` biçimi `/lab/kit`'teki "Columns" örneğinde denendi.

### Sıra

1. ~~Kit~~ (tamam).
2. ~~Film sayfası~~ (tamam), sonra kişi sayfası.
3. Ana sayfa ve hesap sayfası.
4. Salon sayfaları (Oscars, yönetmenler, Top 100): spotlight WebGL sahneleri `useScene` ile.
5. Kökte `EngineProvider drive`, eski `SmoothScrollProvider` ve `src/motion/{stage,scene,scroll}` kaldırılır; `globals.css` süre token'ları `--step-*`'e taşınır.

Testler (25 davranış testi) şu an projenin dışında duruyor, çünkü projede test çalıştırıcısı yok.
