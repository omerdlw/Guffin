"use client";

import { useState, type CSSProperties } from "react";
import { useModal } from "@omerdlw/base-framework/modules/modal";
import { Button, Icon, RADIUS, SegmentedControl, TONE } from "@/ui";
import { MOVIE_COMPACT_PEOPLE, MOVIE_FEATURED_PEOPLE } from "../constants";
import {
  DetailPart,
  DetailSection,
  DetailSwap,
  Heading,
} from "@/features/detail";
import type { PersonEntry } from "../types";
import { PeopleModal, type PeopleModalData } from "./modals";
import { PersonCard } from "./person-card";

type Tab = "cast" | "crew";

function compactCells(count: number, hasMore: boolean): CSSProperties {
  const extra = hasMore ? 1 : 0;
  return {
    "--cells": count + extra,
    "--cells-sm": Math.min(count, 2),
  } as CSSProperties;
}

interface MoviePeopleProps {
  cast: PersonEntry[];
  crew: PersonEntry[];
}

export function MoviePeople({ cast, crew }: MoviePeopleProps) {
  const [openModal] = useModal(PeopleModal);
  const tabs = [
    ...(cast.length ? [{ key: "cast" as const, label: "Cast" }] : []),
    ...(crew.length ? [{ key: "crew" as const, label: "Crew" }] : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0]?.key ?? "cast");
  if (tabs.length === 0) return null;

  const people = tab === "cast" ? cast : crew;
  const featured = people.slice(0, MOVIE_FEATURED_PEOPLE);
  const compact = people.slice(
    MOVIE_FEATURED_PEOPLE,
    MOVIE_FEATURED_PEOPLE + MOVIE_COMPACT_PEOPLE,
  );
  const hasMore = people.length > featured.length + compact.length;

  const openAll = () => {
    const data: PeopleModalData = { cast, crew, initialTab: tab };
    void openModal(data);
  };

  return (
    <DetailSection className="flex w-full flex-col" cue="shelf" now>
      <Heading
        actions={
          <SegmentedControl
            ariaLabel="Cast or crew"
            className={TONE.tabs}
            items={tabs}
            onChange={setTab}
            value={tab}
          />
        }
        icon="solar:users-group-rounded-bold"
        title="Cast & Crew"
      />

      <DetailSwap className="flex flex-col gap-3" cue="cast" id={tab} now>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {featured.map((person, index) => (
            <DetailPart
              as="li"
              className="min-w-0"
              index={index}
              key={person.key}
              name="person"
            >
              <PersonCard index={index} person={person} radius={RADIUS.panel} />
            </DetailPart>
          ))}
        </ul>

        {compact.length > 0 || hasMore ? (
          <div
            className={`grid h-10 gap-3 sm:grid-cols-[repeat(var(--cells),minmax(0,1fr))] ${hasMore ? "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))_2.5rem]" : "grid-cols-[repeat(var(--cells-sm),minmax(0,1fr))]"}`}
            style={compactCells(compact.length, hasMore)}
          >
            {compact.map((person, index) => (
              <DetailPart
                className={`min-w-0 ${index > 1 ? "hidden sm:block" : ""}`}
                index={featured.length + index}
                key={person.key}
                name="person"
              >
                <PersonCard
                  compact
                  index={featured.length + index}
                  person={person}
                  radius={RADIUS.panel}
                />
              </DetailPart>
            ))}
            <DetailPart
              className="min-w-0"
              index={featured.length + compact.length}
              name="person"
            >
              <Button
                aria-label="Show full cast and crew"
                className={TONE.more}
                onClick={openAll}
              >
                <Icon icon="solar:alt-arrow-right-linear" size={16} />
              </Button>
            </DetailPart>
          </div>
        ) : null}
      </DetailSwap>
    </DetailSection>
  );
}
