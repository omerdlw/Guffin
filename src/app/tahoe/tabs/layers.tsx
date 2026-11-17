"use client";

import { useMemo, useState } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { useContextMenu } from "@omerdlw/base-framework/context-menu";
import {
  defineModal,
  ModalContainer,
  useModal,
} from "@omerdlw/base-framework/modal";
import { useToast } from "@omerdlw/base-framework/notification";
import { useConfirm } from "@/design/components/confirm";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { SegmentedControl } from "@/design/components/segmented-control";
import { useShowing } from "@/design/components/room";
import { SHELL, TIP } from "@/design/foundations/layers";
import { cn } from "@/design/ui";
import { Code, Page, Section, Stage, Table } from "../kit";

function LabModalView({ close }: { close: (result?: unknown) => void }) {
  useShowing();
  const [tab, setTab] = useState<"cast" | "crew">("cast");
  return (
    <ModalContainer
      close={close}
      header={{
        title: "Oyuncular ve ekip",
        actions: (
          <SegmentedControl
            ariaLabel="Ekip"
            items={[
              { key: "cast", label: "Oyuncular" },
              { key: "crew", label: "Ekip" },
            ]}
            onChange={setTab}
            value={tab}
          />
        ),
      }}
    >
      <ul className="grid w-[min(88vw,36rem)] grid-cols-2 gap-fib-2 p-fib-4 sm:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <li
            className="flex items-center gap-fib-2 rounded-tile bg-fill p-fib-2 ring-1 ring-edge ring-inset"
            key={i}
          >
            <span className="center size-control-md rounded-full bg-fill-active type-meta font-semibold text-ink">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex flex-col">
              <span className="type-control text-ink">
                {tab === "cast" ? "Oyuncu" : "Ekip"} {i + 1}
              </span>
              <span className="type-label text-ink-muted">Rol</span>
            </span>
          </li>
        ))}
      </ul>
    </ModalContainer>
  );
}

const LabModal = defineModal({
  component: LabModalView,
  position: { desktop: "center", mobile: "bottom" },
  title: "Oyuncular ve ekip",
});

const LAYERS = [
  [
    "Dock",
    <Code key="c">dock-root · SHELL kartları</Code>,
    "Altta yüzen kabuk; yüzeyler açılır, eskisi hayalete döner",
  ],
  [
    "Modal",
    <Code key="c">SHELL + BACKDROP</Code>,
    "Ortada ya da altta; alttaki modal DIM'lenir",
  ],
  [
    "Context menu",
    <Code key="c">SHELL</Code>,
    "Sağ tıkla; öğeler, ayırıcı, tehlike",
  ],
  [
    "Select menüsü",
    <Code key="c">SHELL</Code>,
    "Tetikleyicisinin kenarından açılır",
  ],
  ["Toast", <Code key="c">SHELL</Code>, "Bildirim katmanı"],
  ["Tooltip", <Code key="c">TIP</Code>, "Buzlanmış, lens yok"],
  ["Dock HUD", <Code key="c">setHud</Code>, "Onay, kritik öncelik"],
] as const;

export function LayersTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [openModal] = useModal(LabModal);
  const [answer, setAnswer] = useState<string | null>(null);

  const menu = useMemo(
    () => ({
      id: "tahoe:lab",
      priority: 10,
      target: "[data-lab-menu]",
      items: [
        {
          key: "select",
          icon: "solar:check-circle-linear",
          label: "Seç",
          onSelect: () => void toast("Seç"),
        },
        {
          key: "folder",
          icon: "solar:folder-with-files-linear",
          label: "Yeni liste",
          onSelect: () => void toast("Yeni liste"),
        },
        "separator" as const,
        {
          key: "name",
          icon: "solar:text-bold",
          label: "Ada göre",
          onSelect: () => void toast("Ada göre"),
        },
        {
          key: "date",
          icon: "solar:calendar-linear",
          label: "Tarihe göre",
          onSelect: () => void toast("Tarihe göre"),
        },
        "separator" as const,
        {
          key: "delete",
          danger: true,
          icon: "solar:trash-bin-trash-linear",
          label: "Sil",
          onSelect: () => void toast("Sil"),
        },
      ],
    }),
    [toast],
  );
  useContextMenu(menu);

  return (
    <Page
      eyebrow="5 · 10.2 Katmanlar"
      lead="Yüzen her şey aynı camdan: dock, modal, menüler, toast. Arkasındaki sayfa bir perdeyle (veil) geri çekilir; alttaki modal karartılır (dim). Sıra Z_INDEX'ten gelir."
      source="design/theme/{dock,modal,context-menu,notification}.ts · foundations/layers.ts"
      title="Katmanlar"
    >
      <Section
        note="Gerçek modüller: dock HUD'u, modal, toast, context menu."
        title="Aç ve dene"
      >
        <Stage>
          <Button
            intent="neutral"
            onClick={async () => {
              const yes = await confirm({
                action: "Sil",
                description: "Bu listeyi silmek geri alınamaz.",
                icon: "solar:trash-bin-trash-bold",
                title: "Liste silinsin mi?",
                tone: "danger",
              });
              setAnswer(yes ? "Onaylandı" : "Vazgeçildi");
            }}
          >
            <Icon icon="solar:danger-triangle-bold" size={16} /> Tehlikeli onay
          </Button>
          <Button
            intent="neutral"
            onClick={async () => {
              const yes = await confirm({
                action: "Paylaş",
                description: "Listen herkese açık olacak.",
                icon: "solar:share-bold",
                title: "Paylaşılsın mı?",
                tone: "neutral",
              });
              setAnswer(yes ? "Paylaşıldı" : "Vazgeçildi");
            }}
          >
            Nötr onay
          </Button>
          <Button intent="neutral" onClick={() => void openModal({})}>
            Modal aç
          </Button>
          <Button intent="neutral" onClick={() => toast("Listeye eklendi")}>
            Toast
          </Button>
          <Button
            intent="neutral"
            onClick={() =>
              void toast.promise(
                new Promise((resolve) => setTimeout(resolve, 1600)),
                {
                  loading: "Kaydediliyor…",
                  success: "Kaydedildi",
                },
              )
            }
          >
            Promise toast
          </Button>
          {answer ? <span className="type-meta text-ink">{answer}</span> : null}
        </Stage>
        <div
          className={cn(
            SHELL,
            "grid h-36 cursor-context-menu place-items-center rounded-shell type-title text-ink",
          )}
          data-lab-menu=""
        >
          <span className="flex items-center gap-fib-2">
            <Icon icon="solar:cursor-bold" size={20} /> Sağ tıkla: context menu
          </span>
        </div>
      </Section>

      <Section
        note="Katmanlar yan yana, açık durumlarında."
        title="Statik örnekler"
      >
        <Stage className="items-start">
          <div
            className={cn(
              SHELL,
              "flex w-64 flex-col gap-1 rounded-panel p-1.5",
            )}
          >
            {[
              ["solar:check-circle-linear", "Seç"],
              ["solar:folder-with-files-linear", "Yeni liste"],
            ].map(([icon, label]) => (
              <span
                className="flex h-control-md items-center gap-fib-3 rounded-tile px-fib-3 type-control text-ink hover:bg-fill-lift"
                key={label}
              >
                <Icon icon={icon!} size={18} /> {label}
              </span>
            ))}
            <span className="mx-fib-3 my-1 h-px bg-rule" />
            <span className="flex h-control-md items-center gap-fib-3 rounded-tile px-fib-3 type-control text-danger hover:bg-fill-lift">
              <Icon icon="solar:trash-bin-trash-linear" size={18} /> Sil
            </span>
          </div>
          <div
            className={cn(
              SHELL,
              "flex w-72 items-center gap-fib-3 rounded-full py-fib-2 pr-fib-4 pl-fib-2",
            )}
          >
            <span className="center size-control-md rounded-full bg-(--liquid-well) text-watched">
              <Icon icon="solar:check-circle-bold" size={20} />
            </span>
            <span className="flex flex-col">
              <span className="type-control font-medium text-ink">
                İzlendi olarak işaretlendi
              </span>
              <span className="type-label text-ink-muted">
                Oppenheimer · 2023
              </span>
            </span>
          </div>
          <span className={cn(TIP, "rounded-thumb px-fib-2 py-1 type-meta")}>
            Tooltip
          </span>
          <div
            className={cn(
              SHELL,
              "flex w-80 flex-col gap-fib-3 rounded-shell p-fib-4",
            )}
          >
            <span className="type-title font-semibold text-ink">
              Yeni liste
            </span>
            <Input placeholder="Liste adı" />
            <div className="flex gap-fib-2">
              <Button size="sm" width="fill">
                Vazgeç
              </Button>
              <Button intent="primary" size="sm" width="fill">
                Oluştur
              </Button>
            </div>
          </div>
        </Stage>
      </Section>

      <Section title="Haritası">
        <Table head={["Katman", "Malzeme", "Davranış"]} rows={LAYERS} />
      </Section>
    </Page>
  );
}
