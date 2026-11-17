"use client";

import { Avatar, Loader, Spinner } from "@omerdlw/base-framework/ui";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { MediaCard } from "@/design/components/media-card";
import {
  CarouselSkeleton,
  SectionHeaderSkeleton,
  SkeletonBlock,
  SkeletonLines,
  TabsSkeleton,
} from "@/design/components/skeleton";
import { TONE } from "@/design/foundations/tones";
import { CAROUSEL_ITEM } from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import { Label, Page, PANEL, Section, Stage } from "../kit";

const FILMS = [
  "Paris, Texas",
  "Heat",
  "Stalker",
  "In the Mood for Love",
  "Mulholland Drive",
  "Persona",
  "Yi Yi",
  "Close-Up",
  "Ran",
  "Vertigo",
] as const;

function Caption({ title, year }: { title: string; year: number }) {
  return (
    <span className="flex flex-col">
      <span className="truncate type-control font-medium text-ink">
        {title}
      </span>
      <span className="type-label text-ink-body">{year}</span>
    </span>
  );
}

export function MediaTab({ wallpaper }: { wallpaper: string }) {
  const image = { crossOrigin: "anonymous" as const, src: wallpaper };
  return (
    <Page
      eyebrow="5 Medya"
      lead="Afişler, sahneler, kişiler, yüklenirken iskeletler. Bir kart kendi rolünü söyler (cine-card); hareketini sayfa verir."
      source="components/{media-card,carousel,skeleton}.tsx"
      title="Medya"
    >
      <Section
        note="poster · square · video; başlık, üst katman, tooltip, boş durum."
        title="MediaCard"
      >
        <Stage className="grid grid-cols-2 items-start gap-fib-4 sm:grid-cols-4">
          <MediaCard
            caption={<Caption title="Poster" year={1984} />}
            image={image}
            radius="var(--radius-tile)"
            tooltip="Paris, Texas"
          />
          <MediaCard
            aspect="square"
            caption={<Caption title="Square" year={1995} />}
            image={image}
            overlay={
              <span className="absolute top-fib-2 right-fib-2 center size-control-xs rounded-full bg-watched text-on-accent">
                <Icon icon="solar:check-read-linear" size={14} />
              </span>
            }
            radius="var(--radius-card)"
          />
          <MediaCard
            aspect="video"
            caption={<Caption title="Video" year={2000} />}
            className="col-span-2"
            image={image}
            radius="var(--radius-card)"
          />
          <MediaCard
            caption={<Caption title="Görsel yok" year={2026} />}
            image={{ src: null }}
            radius="var(--radius-tile)"
          />
        </Stage>
      </Section>

      <Section
        note="Ok tuşları cam (TONE.arrows); sürükleyerek de kayar."
        title="Carousel"
      >
        <Carousel
          arrowClassName={TONE.arrows}
          itemClassName={CAROUSEL_ITEM}
          label="Lab"
          part="slide"
        >
          {FILMS.map((title, i) => (
            <MediaCard
              caption={<Caption title={title} year={1980 + i * 4} />}
              image={image}
              key={title}
              radius="var(--radius-tile)"
            />
          ))}
        </Carousel>
      </Section>

      <Section note="Görsel yoksa baş harfler." title="Avatar">
        <Stage>
          {[24, 32, 40, 55, 89].map((size) => (
            <div className="flex flex-col items-center gap-fib-2" key={size}>
              <Avatar name="Wong Kar-wai" size={size} />
              <span className="type-label text-ink-body">{size}</span>
            </div>
          ))}
          {[40, 55, 89].map((size) => (
            <Avatar key={`i${size}`} name="Tahoe" size={size} src={wallpaper} />
          ))}
        </Stage>
      </Section>

      <Section note="Yükleme durumları sayfanın şeklini korur." title="İskelet">
        <div className={cn(PANEL, "flex flex-col gap-fib-5 p-fib-5")}>
          <SectionHeaderSkeleton />
          <TabsSkeleton chosen="6rem" width="18rem" />
          <div className="flex gap-fib-4">
            <SkeletonBlock className="aspect-[2/3] w-32 rounded-tile" />
            <div className="flex-1">
              <SkeletonLines widths={["80%", "60%", "90%", "40%"]} />
            </div>
          </div>
          <CarouselSkeleton
            aspect="aspect-[2/3]"
            count={4}
            itemClassName={CAROUSEL_ITEM}
          />
        </div>
      </Section>

      <Section title="Yükleniyor">
        <Stage>
          <div className="flex flex-col items-center gap-fib-2">
            <Loader size={24} />
            <Label name="Loader" />
          </div>
          <div className="flex flex-col items-center gap-fib-2">
            <Spinner size={24} />
            <Label name="Spinner" />
          </div>
        </Stage>
      </Section>
    </Page>
  );
}
