"use client";

import { useState } from "react";
import {
  defineModal,
  ModalContainer,
  type ModalContainerProps,
} from "@omerdlw/base-framework/modules/modal";
import { RADIUS, SegmentedControl } from "@/ui";
import { Tube } from "@/motion/effects";
import { useShowing } from "@/motion/engine";
import type { PersonEntry } from "../types";
import { PersonCard } from "./person-card";

interface ModalProps<T> {
  close: (result?: unknown) => void;
  data: T;
  header: ModalContainerProps["header"];
}

export type PeopleModalData = {
  cast: PersonEntry[];
  crew: PersonEntry[];
  initialTab: "cast" | "crew";
};

function PeopleModalView({ close, data, header }: ModalProps<PeopleModalData>) {
  const [tab, setTab] = useState(data.initialTab);
  const tabs = [
    ...(data.cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(data.crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
  const people = tab === "cast" ? data.cast : data.crew;

  return (
    <ModalContainer close={close} header={header}>
      <div className="flex flex-col gap-3">
        <SegmentedControl
          ariaLabel="Cast or crew"
          round
          items={tabs}
          onChange={setTab}
          value={tab}
        />
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {people.map((person) => (
            <li className="min-w-0" key={person.key}>
              <PersonCard
                onNavigated={() => close()}
                person={person}
                radius={RADIUS.card}
              />
            </li>
          ))}
        </ul>
      </div>
    </ModalContainer>
  );
}

export const PeopleModal = defineModal({
  component: PeopleModalView,
  position: { desktop: "center", mobile: "bottom" },
  title: "Cast & crew",
});

export type VideoModalData = {
  key: string;
  name: string;
};

function VideoModalView({ data }: ModalProps<VideoModalData>) {
  useShowing();
  return (
    <Tube className="aspect-video w-[min(92vw,64rem)] overflow-hidden rounded-sheet bg-black ring-1 ring-edge-hover ring-inset">
      <iframe
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(data.key)}?autoplay=1&rel=0`}
        title={data.name}
      />
    </Tube>
  );
}

export const VideoModal = defineModal({
  chrome: "bare",
  component: VideoModalView,
  position: "center",
});
