# Progress

Kısa durum dosyası: her anlamlı iş bitince güncellenir. Geçmiş için `git log`.
Son güncelleme: 2026-11-18

## Şu an

Supabase → Postgres/Neon geçişi (2026-11-18, `neon-migration` dalı): Better
Auth (email kodu, passkey, Google/GitHub/X), Drizzle + node-postgres, RLS
korunuyor (`anon`/`authenticated` + `app.viewer_id`), şema `drizzle/` SQL'inde.
Realtime yerine odakta/dakikada bir yenileme (`SocialSync`). pg_cron yerine
`POST /api/cron/prune` (`CRON_SECRET`). Yerelde Docker Postgres + Mailpit,
seed ve RLS probe'u (129/129) pg üzerinde. Neon'da şema kurulu; mail Resend (yerelde Mailpit); hosting Netlify.

## Bitti

- Tasarım sistemi: rol tabanlı renk/tip/şekil, tek tema (kağıt; koyu tema
  2026-11-17'de kaldırıldı, görsel üstü için `.on-photo`), resimden gelen
  grade ve sayfa rengi
- Liquid glass: lens motoru (`liquid.tsx`), sayfadaki cam kontroller
  (`liquid-control`), dock içinde well'ler, cama dönen thumb'lar
  (switch, segmented control), liquid touch (press/lean), cursor camı
  kontrol şekline oturuyor (`motion/shape.ts`)
- Hareket motoru: CSS'e derlenen stage/choreo (`src/motion`), φ tabanlı zamanlama
- Koreografi: home, detail (movie/tv/person/season/reviews), account (9 sekme),
  search, dock, dock surface'leri, dock action'ları (label/rakam/ikon geçişleri),
  legal, directors, oscars/top-100 chrome'u
- Modüller: modal, context menu, toast, select menüsü φ diliyle hareket ediyor
  (`theme/motion.ts` ortak sözlük); modal camı soldurulmaz, `--modal-glass`
- Kural ihlalleri temizlendi; ölü `palette.css` kaldırıldı
- Detail kuralı: yalnızca hero açılışı sıralı; diğer her rol görününce kendi
  girişini oynar, aşağıdan çıkınca geri sarılır, yukarı scroll'da tekrar oynamaz
- Framework 3.2.0: tasarımsız; tüm tasarım Guffin'de
- Dokümantasyon: `CLAUDE.md` (proje haritası), `docs/design/README.md` + `docs/design/`
  koddan doğrulanarak yeniden yazıldı, yeni `09-glass.md`
- `/tahoe`: parlak duvar kağıdı üstünde cam test sayfası
- Movie/TV düzeni: tag'ler özet altında chip (`DetailTags`), künye
  sadeleşti (yıl/süre/sezon dock'ta, tekrar edilmiyor) ve mobilde 4 satıra katlanıyor (`FactsFold`), lg sidebar
  18rem; TV'de ödüller, popüler listeler, "Continue" kartı (`ShowResume`);
  popüler listeler artık `media_type` ile süzülüyor

- Renk/ışık (2026-11-17): mürekkep tek siyah + opaklık (100/88/74/56/32);
  cam kenarı sol üst anahtar + sağ alt dolgu ışığıyla (`--rim-*`, conic
  `::after`, `liquid.css`); anlam renkleri kağıda göre koyulaştı, aktif
  like/watched/watchlist ikonları kendi renginde (`COLLECTION_MARKS`)

- Yumuşaklık (2026-11-17): proje geneli renk/dolgu/gölge geçişi
  (`--soft-*`, `interaction.css`), sarsıntılı SETTLE/TOUCH/SPRING eğrileri
  yumuşak başlangıçlı oldu, press 0.236s, choreo dokunuşları yumuşak
  geçişleri koruyor
- Sinematik koreografi (2026-11-17): sahne başına `tempo`/`reach`
  (`choreo.ts` `paced`); sayfalar √φ yavaş + φ uzak, surface/search
  1.236/1.272; modal, menü, toast bir vuruş yavaş, menüde sekme yok

- Performans (2026-11-17, görünmez): cam haritaları canvas'sız (`png.ts`,
  piksel piksel aynı, 3.6× hızlı) ve `localStorage`'da önbellekli; cam
  okumaları ResizeObserver'da toplu; scroll sürücüsü aktifken `scrollY`
  okunmuyor; stage'in sayfa sonu kontrolü kare sonrası; `ActionArrival` dock inince duruyor.
  Prod ölçümü: yükleme script'i movie 408→308ms, tv 420→313, person 387→309,
  home 299→177, season 366→246; uzun kare bloklaması movie 260→54ms

## Sırada

- [x] Neon (`Guffin`, `production` dalı) baseline uygulandı (2026-11-18)
- [ ] Netlify: siteyi bağla, `.env.netlify`'yi içe aktar, `NEXT_PUBLIC_SITE_URL`
      gerçek adres; günlük prune `netlify/functions/prune.mts`
- [ ] Resend: alan adını doğrula, `EMAIL_FROM` ayarla
- [ ] Giriş akışlarını tarayıcıda gör: email kodu, passkey, OAuth bağlama,
      email değiştirme, oturumlar, hesap silme

- [ ] Sinematik tempoyu tarayıcıda gör: detail açılış dizisi (çok mu uzun?),
      home hero, account, dock surface'leri, modal/menü/toast

- [ ] Yumuşaklığı tarayıcıda gör: butonlar, dock, segmented/switch (yay
      ile sürülen parçalar geride kalmıyor mu), hover etiket değişimleri
- [ ] Renk/ışık değişikliğini tarayıcıda gör (kağıt, `.on-photo`, dock, alanlar)

- [ ] Movie/TV düzen değişikliğini tarayıcıda gör: mobil künye katlama,
      lg 18rem sidebar'da aksiyon satırı, tag hareketleri, GoT ödülleri
- [ ] Ertelenen doğrulamalar (kullanıcı isteyince): Playwright walkthrough,
      perf ölçümü, ekran görüntüsü karşılaştırmaları; özellikle modal açılışında
      camın buzlanması (kağıt ve görsel üstü, `/tahoe`), select menüsü, toast, directors
      duvarı geçişi
