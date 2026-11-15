# Progress

Kısa durum dosyası: her anlamlı iş bitince güncellenir. Geçmiş için `git log`.
Son güncelleme: 2026-11-16

## Şu an

`motion-reset` dalı `main`'e birleştirildi (fast-forward) ve push edildi.
Çalışma `main` üzerinden devam ediyor. Kapılar temiz: typecheck, lint,
93 test, production build.

## Bitti

- Tasarım sistemi: rol tabanlı renk/tip/şekil, ayrı ayrı yönetilen açık/koyu
  tema, resimden gelen grade ve sayfa rengi
- Liquid glass: lens motoru (`liquid.tsx`), sayfadaki cam kontroller
  (`liquid-control`), dock içinde well'ler, cama dönen thumb'lar
  (switch, segmented control), liquid touch (press/lean), cursor camı
  kontrol şekline oturuyor (`motion/shape.ts`)
- Hareket motoru: CSS'e derlenen stage/choreo (`src/motion`), φ tabanlı zamanlama
- Koreografi: home, detail (movie/tv/person/season/reviews), account (9 sekme),
  search, dock, dock surface'leri, dock action'ları (label/rakam/ikon geçişleri)
- Detail kuralı: yalnızca hero açılışı sıralı; diğer her rol görününce kendi
  girişini oynar, aşağıdan çıkınca geri sarılır, yukarı scroll'da tekrar oynamaz
- Framework 3.2.0: tasarımsız; tüm tasarım Guffin'de
- Dokümantasyon: `CLAUDE.md` (proje haritası), `DESIGN.md` + `design/rules/`
  koddan doğrulanarak yeniden yazıldı, yeni `09-glass.md`
- `/tahoe`: parlak duvar kağıdı üstünde cam test sayfası

## Sırada

- [ ] Modül koreografisi: modal, context menu, toast (hâlâ INSTANT)
- [ ] Spotlights (oscars/top-100/directors) ve legal stage'lerine koreografi yaz
      (rolleri var, motion yok)
- [ ] Kural ihlallerini düzelt (`design/rules/14` grep denetimleri buluyor):
      `spotlights/oscars/view.tsx` (`rounded-md shadow-lg`),
      `profile/diary/month.tsx` (`text-white`, `bg-black/60`, `from-black/70`),
      `movie/people-modal.tsx` (`tracking-tight`), `home/opening.tsx`
      (`font-normal`), `tones.ts` `ACTION_TONE` (`hover:text-black`)
- [ ] `styles/system/palette.css` muhtemelen ölü (themes.css her değişkeni
      eziyor): doğrula ve kaldır
- [ ] Ertelenen doğrulamalar (kullanıcı isteyince): Playwright walkthrough,
      perf ölçümü, ekran görüntüsü karşılaştırmaları

## Kararlar (geri dönülmesin)

- Detail sayfasında katı gövde sırası reddedildi ("kötü duruyor").
- Görünür davranışı değiştiren performans optimizasyonları reddedildi
  (off-screen animasyon atlama, native scroll, tint throttling).
- Kontrollerde içerik kırılması + maske lensi reddedildi; liquid materyal kullanılır.
- Animasyonda blur yok (compositor'da çalışmıyor, camı bulandırıyor).
- Guest/member ayrı deneyimleri ve spec/plan seremonisi istenmiyor.
