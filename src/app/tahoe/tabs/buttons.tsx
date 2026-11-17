"use client";

import { useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { ActionButton } from "@/design/components/action-button";
import { Icon } from "@/design/components/icon";
import { linkVariants, TextButton } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import { Code, Label, Page, Section, Stage, Table } from "../kit";

const INTENTS = [
  { key: "primary", note: "Tek gönder aksiyonu" },
  { key: "neutral", note: "Sayfadaki cam kontrol" },
  { key: "outline", note: "Dokununca dolar" },
  { key: "ghost", note: "Dolgusuz" },
  { key: "chosen", note: "Seçili (grade)" },
  { key: "glass", note: "Görsel üstü lens" },
  { key: "danger", note: "Yıkıcı" },
  { key: "armed", note: "Onaylanmış yıkıcı" },
] as const;

const SIZES = ["xs", "sm", "chrome", "md", "lg"] as const;
const SHAPES = ["card", "pill", "thumb"] as const;
const ICON_SIZE = { xs: 12, sm: 14, chrome: 16, md: 18, lg: 20 } as const;

const LINKS = ["inline", "reveal", "hairline", "label", "quiet"] as const;

export function ButtonsTab() {
  const [actions, setActions] = useState({
    watched: true,
    liked: false,
    saved: false,
    rated: false,
  });
  const flip = (key: keyof typeof actions) => () =>
    setActions((s) => ({ ...s, [key]: !s[key] }));
  const [busy, setBusy] = useState(false);
  return (
    <Page
      eyebrow="5 Butonlar"
      lead="Bir buton sayfada camdır: neutral tone onu doldurur, outline dokunulana kadar berrak bırakır. Diğer tone'lar kendi dolgusunu korur. Her buton dokunuşu alır."
      source="design/recipes.ts (buttonRoot) · foundations/tones.ts"
      title="Butonlar"
    >
      <Section title="Intent">
        <Stage>
          {INTENTS.map(({ key, note }) => (
            <div className="flex flex-col items-start gap-fib-2" key={key}>
              <Button intent={key}>{key}</Button>
              <span className="type-label text-ink-body">{note}</span>
            </div>
          ))}
        </Stage>
      </Section>

      <Section
        note="Intent × boyut: kontrol merdiveninin beş basamağı."
        title="Matris"
      >
        <Stage className="grid grid-cols-[auto_repeat(5,auto)] items-center justify-start gap-x-fib-3 gap-y-fib-2 overflow-x-auto">
          <span />
          {SIZES.map((size) => (
            <span className="type-label text-ink-body" key={size}>
              {size}
            </span>
          ))}
          {INTENTS.map(({ key }) => (
            <div className="contents" key={key}>
              <Code>{key}</Code>
              {SIZES.map((size) => (
                <Button intent={key} key={size} size={size}>
                  Kaydet
                </Button>
              ))}
            </div>
          ))}
        </Stage>
      </Section>

      <Section title="Şekil">
        <Stage>
          {SHAPES.map((shape) => (
            <div className="flex flex-col items-start gap-fib-2" key={shape}>
              <Button shape={shape}>shape=&quot;{shape}&quot;</Button>
              <Button intent="primary" shape={shape}>
                Birincil
              </Button>
            </div>
          ))}
        </Stage>
      </Section>

      <Section
        note="icon: kare, merdivenin aynı basamağı."
        title="İkon butonlar"
      >
        <Stage className="flex-col items-start">
          {(["neutral", "glass", "ghost", "primary"] as const).map((intent) => (
            <div className="flex flex-wrap items-center gap-fib-2" key={intent}>
              {SIZES.map((size) => (
                <Tooltip key={size} position="top" text={`${intent} · ${size}`}>
                  <Button
                    aria-label={size}
                    icon
                    intent={intent}
                    shape="pill"
                    size={size}
                  >
                    <Icon icon="solar:heart-bold" size={ICON_SIZE[size]} />
                  </Button>
                </Tooltip>
              ))}
              <Code>{intent}</Code>
            </div>
          ))}
        </Stage>
      </Section>

      <Section title="İkon ve metin">
        <Stage>
          <Button intent="primary" shape="pill">
            <Icon icon="solar:play-bold" size={16} /> Fragmanı izle
          </Button>
          <Button shape="pill">
            <Icon icon="solar:add-circle-bold" size={16} /> Listeye ekle
          </Button>
          <Button intent="outline" shape="pill">
            Tümünü gör <Icon icon="solar:alt-arrow-right-linear" size={16} />
          </Button>
          <Button intent="danger" shape="pill">
            <Icon icon="solar:trash-bin-trash-bold" size={16} /> Sil
          </Button>
        </Stage>
      </Section>

      <Section title="Genişlik ve durum">
        <Stage className="flex-col items-stretch">
          <Button intent="primary" width="full">
            width=&quot;full&quot;
          </Button>
          <div className="flex gap-fib-2">
            <Button width="fill">fill</Button>
            <Button width="fill">fill</Button>
            <Button intent="primary" width="fill">
              fill
            </Button>
          </div>
          <div className="flex flex-wrap gap-fib-2">
            <Button
              disabled={busy}
              intent="primary"
              loading={busy}
              onClick={() => {
                setBusy(true);
                setTimeout(() => setBusy(false), 1800);
              }}
            >
              Kaydet (bas)
            </Button>
            <Button disabled>Devre dışı</Button>
            <Button disabled intent="primary">
              Devre dışı
            </Button>
          </div>
        </Stage>
      </Section>

      <Section
        note="Film sayfasının aksiyonları: ikon ve etiket dock'un kelimeleri hareket ettirdiği gibi değişir."
        title="Aksiyon butonları"
      >
        <Stage>
          <div className="grid w-full max-w-xl grid-cols-2 gap-fib-2 sm:grid-cols-4">
            <ActionButton
              active={actions.watched}
              icon={{ off: "solar:eye-linear", on: "solar:eye-bold" }}
              label={actions.watched ? "İzlendi" : "İzle"}
              onClick={flip("watched")}
            />
            <ActionButton
              active={actions.liked}
              icon={{ off: "solar:heart-linear", on: "solar:heart-bold" }}
              label={actions.liked ? "Beğenildi" : "Beğen"}
              onClick={flip("liked")}
            />
            <ActionButton
              active={actions.saved}
              icon={{ off: "solar:bookmark-linear", on: "solar:bookmark-bold" }}
              label="İzlenecek"
              onClick={flip("saved")}
            />
            <ActionButton
              active={actions.rated}
              icon={{ off: "solar:star-linear", on: "solar:star-bold" }}
              label={actions.rated ? "4.5" : "Puanla"}
              onClick={flip("rated")}
            />
          </div>
        </Stage>
      </Section>

      <Section
        note="Metin bağlantıları ve metin butonu (TextButton)."
        title="Bağlantılar"
      >
        <Stage className="flex-col items-start">
          {LINKS.map((variant) => (
            <div className="flex items-baseline gap-fib-4" key={variant}>
              <a
                className={`${linkVariants({ variant })} type-body text-ink-lead`}
                href="#buttons"
              >
                Christopher Nolan
              </a>
              <Code>{variant}</Code>
            </div>
          ))}
          <div className="flex items-baseline gap-fib-4">
            <TextButton className="type-body">Daha fazla göster</TextButton>
            <Code>TextButton</Code>
          </div>
        </Stage>
      </Section>

      <Section title="Kurallar">
        <Table
          head={["Kural", "Neden"]}
          rows={[
            [
              "Bir formda tek primary",
              "Grade seçili durumu işaretler, gönderi asla",
            ],
            ["Dock içinde WELL", "Camın üstünde cam yok"],
            [
              <Label key="l" name="Görsel üstünde glass" />,
              "Sayfa kontrolü bükecek bir şey bulmaz; görselde lens anlamlıdır",
            ],
            ["Disabled → opacity-50", "STATE.disabled, ayrı renk yok"],
          ]}
        />
      </Section>
    </Page>
  );
}
