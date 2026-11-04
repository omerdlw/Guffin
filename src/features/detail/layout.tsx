import type { JSX, ReactNode } from "react";
import type { Awards } from "@/lib/tmdb/shared";
import { FactLink } from "@/ui/button";
import { Tooltip } from "@/ui/feedback";
import { Icon } from "@/ui/media";
import {
  ASIDE_CLASS,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  FACT_ROW_TYPE,
  HEADER_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  SIDEBAR_CLASS,
  TONE,
} from "@/ui/tokens";
import { AwardsView } from "./awards";
import { SIDEBAR_FACTS_CLASS, STAGE_LOOK } from "./constants";
import {
  DetailExpose,
  DetailHeader,
  DetailPart,
  DetailSection,
  DetailWallStage,
} from "./motion";
import { StickyAside } from "./stage";
import type { AwardsGrouping, Fact, FactName } from "./types";
import { hasAwards } from "./utils";

function FactRow({
  children,
  index,
  label,
}: {
  children: ReactNode;
  index: number;
  label: string;
}) {
  return (
    <DetailPart
      className="group/row relative flex py-3 first:pt-0 last:pb-0 sm:max-lg:grow-2 sm:max-lg:items-center sm:max-lg:first:grow sm:max-lg:first:items-start sm:max-lg:last:grow sm:max-lg:last:items-end"
      index={index}
      name="row"
    >
      <div className="flex w-full items-baseline justify-between gap-6">
        <dt className={`shrink-0 ${TONE.label} text-ink-muted`}>
          <DetailExpose hover index={index} part="label" text={label} />
        </dt>
        <dd
          className={`min-w-0 text-right ${FACT_ROW_TYPE} font-medium text-ink tabular-nums`}
        >
          {children}
        </dd>
      </div>
      <DetailPart
        className={`absolute inset-x-0 bottom-0 h-px ${TONE.rule} group-last/row:hidden`}
        index={index}
        name="line"
      />
    </DetailPart>
  );
}

function FactNames({
  index,
  max,
  names,
}: {
  index: number;
  max: number;
  names: readonly FactName[];
}) {
  const visible = names.slice(0, max);
  const hidden = names.slice(max);
  return (
    <>
      {visible.map((name, at) => {
        const text = (
          <DetailExpose hover index={index} part="value" text={name.text} />
        );
        return (
          <span key={`${name.text}-${at}`}>
            {name.href ? (
              <DetailPart as="span" index={index} name="value">
                <FactLink href={name.href} label={name.text}>
                  {text}
                </FactLink>
              </DetailPart>
            ) : (
              text
            )}
            {at < visible.length - 1 ? (
              <DetailPart as="span" index={index} name="value">
                {", "}
              </DetailPart>
            ) : null}
          </span>
        );
      })}
      {hidden.length > 0 ? (
        <Tooltip
          position="top"
          text={hidden.map((name) => name.text).join(", ")}
        >
          <span className="ml-1.5 inline-block cursor-help">
            <DetailPart
              as="span"
              className="inline-block type-meta font-bold text-ink-body"
              index={index}
              name="value"
            >
              +{hidden.length}
            </DetailPart>
          </span>
        </Tooltip>
      ) : null}
    </>
  );
}

function FactText({ children, index }: { children: string; index: number }) {
  return <DetailExpose hover index={index} part="value" text={children} />;
}

export const namesFact = (
  label: string,
  max: number,
  names: readonly FactName[],
): Fact => ({
  label,
  value: (index) => <FactNames index={index} max={max} names={names} />,
});

export const textFact = (label: string, text: string): Fact => ({
  label,
  value: (index) => <FactText index={index}>{text}</FactText>,
});

function DetailFacts({ facts }: { facts: readonly Fact[] }) {
  return (
    <div className={SIDEBAR_FACTS_CLASS}>
      <dl className="flex flex-col sm:max-lg:flex-1">
        {facts.map((fact, index) => (
          <FactRow index={index} key={fact.label} label={fact.label}>
            {fact.value(index)}
          </FactRow>
        ))}
      </dl>
    </div>
  );
}

export function DetailLayout({
  after,
  backdrop,
  className,
  header,
  intermission,
  main,
  sidebar,
  wall,
}: {
  after?: ReactNode;
  backdrop: ReactNode | null;
  className: string;
  header: ReactNode;
  intermission: ReactNode;
  main: ReactNode;
  sidebar: ReactNode;
  wall: ReactNode;
}): JSX.Element {
  return (
    <main
      className={`${className} ui-scene overflow-x-clip ${PAGE_CLASS}`}
      data-cinematic=""
    >
      {intermission}
      <DetailWallStage cue="wall" wall={wall}>
        <div className={CONTAINER_CLASS}>
          {backdrop}

          <div className={pageBodyClass(Boolean(backdrop))}>
            <div className={COLUMNS_CLASS}>
              <header className={HEADER_CLASS}>{header}</header>

              <StickyAside className={ASIDE_CLASS}>{sidebar}</StickyAside>

              {main}
            </div>

            {after}
          </div>
        </div>
      </DetailWallStage>
    </main>
  );
}

export function DetailSidebar({
  children,
  facts,
}: {
  children: ReactNode;
  facts: readonly Fact[];
}): JSX.Element {
  return (
    <div className={SIDEBAR_CLASS}>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
      <DetailFacts facts={facts} />
    </div>
  );
}

export function Heading({
  actions,
  icon,
  title,
}: {
  actions?: ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <DetailHeader
      actions={actions}
      icon={<Icon icon={icon} size={18} />}
      nameClassName={`min-w-0 ${TONE.label} text-ink-body`}
      part="header"
      title={title}
    />
  );
}

export async function DetailAwards({
  awards,
  groupings,
  showRecipients = false,
}: {
  awards: Promise<Awards | null>;
  groupings: readonly AwardsGrouping[];
  showRecipients?: boolean;
}): Promise<JSX.Element | null> {
  const resolved = await awards;
  if (!hasAwards(resolved)) return null;

  return (
    <DetailSection className="flex w-full flex-col" cue="awards">
      <Heading icon="solar:cup-star-bold" title="Awards" />
      <DetailPart name="awards">
        <AwardsView
          awards={resolved}
          groupings={groupings}
          look={STAGE_LOOK}
          showRecipients={showRecipients}
        />
      </DetailPart>
    </DetailSection>
  );
}
