# Progress

Kısa durum dosyası: her anlamlı iş bitince güncellenir. Geçmiş için `git log`.
Son güncelleme: 2026-11-17

## Şu an

`module-motion` dalı: modül koreografisi, legal ve spotlight sahneleri, kural
düzeltmeleri. Kapılar temiz: typecheck, lint, 93 test, production build.
Tarayıcıda henüz bakılmadı.

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
- Dokümantasyon: `CLAUDE.md` (proje haritası), `DESIGN.md` + `design/rules/`
  koddan doğrulanarak yeniden yazıldı, yeni `09-glass.md`
- `/tahoe`: parlak duvar kağıdı üstünde cam test sayfası
- Movie/TV düzeni: tag'ler özet altında chip (`DetailTags`), künye
  sadeleşti (yıl/süre/sezon dock'ta, tekrar edilmiyor) ve mobilde 4 satıra katlanıyor (`FactsFold`), lg sidebar
  18rem; TV'de ödüller, popüler listeler, "Continue" kartı (`ShowResume`);
  popüler listeler artık `media_type` ile süzülüyor

## Sırada

- [ ] Movie/TV düzen değişikliğini tarayıcıda gör: mobil künye katlama,
      lg 18rem sidebar'da aksiyon satırı, tag hareketleri, GoT ödülleri
- [ ] Ertelenen doğrulamalar (kullanıcı isteyince): Playwright walkthrough,
      perf ölçümü, ekran görüntüsü karşılaştırmaları; özellikle modal açılışında
      camın buzlanması (kağıt ve görsel üstü, `/tahoe`), select menüsü, toast, directors
      duvarı geçişi
