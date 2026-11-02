import type { ReactNode } from "react";
import { FACT_ROW_TYPE, FactLink, TONE, Tooltip } from "@/ui";
import { DetailExpose, DetailPart } from "../motion";

// A fact is one row: its label, its value and the rule under it are three
// parts at the row's place, so the rows come in one after another.
function Row({
  children,
  index,
  label,
}: {
  children: ReactNode;
  index: number;
  label: string;
}) {
  return (
    <div className="group/row relative flex py-3 first:pt-0 last:pb-0 sm:max-lg:grow-2 sm:max-lg:items-center sm:max-lg:first:grow sm:max-lg:first:items-start sm:max-lg:last:grow sm:max-lg:last:items-end">
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
    </div>
  );
}

export interface FactName {
  href?: string;
  text: string;
}

// A row's names, the first few shown and the rest counted in a tooltip.
export function FactNames({
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
              // The link's underline is drawn by the link, not the text, so
              // the link comes in with the name.
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

export function FactText({
  children,
  index,
}: {
  children: string;
  index: number;
}) {
  return <DetailExpose hover index={index} part="value" text={children} />;
}

export interface Fact {
  label: string;
  value: (index: number) => ReactNode;
}

export const SIDEBAR_FACTS_CLASS =
  "flex flex-col gap-6 sm:col-start-2 sm:max-lg:self-stretch lg:contents";

export function DetailFacts({ facts }: { facts: readonly Fact[] }) {
  return (
    <div className={SIDEBAR_FACTS_CLASS}>
      <dl className="flex flex-col sm:max-lg:flex-1">
        {facts.map((fact, index) => (
          <Row index={index} key={fact.label} label={fact.label}>
            {fact.value(index)}
          </Row>
        ))}
      </dl>
    </div>
  );
}
