"use client";

import type { JSX } from "react";
import { DockLink, ExternalLink, linkVariants } from "@/design/components/link";
import {
  CONTAINER_CLASS,
  HEADLINE_BOX,
  PAGE_CLASS,
  PROSE_CLASS,
} from "@/design/foundations/layout";
import { TONE, TONES } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { TV_ENABLED } from "@/lib/env";
import { defineStage } from "@/motion/stage";
import {
  LEGAL_CONTACT_EMAIL,
  type LegalBlock,
  type LegalDocument,
} from "./documents";

const LEGAL_LAST_UPDATED = TV_ENABLED ? "November 7, 2026" : "October 4, 2026";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

const LEGAL_PILL_BASE_CLASS =
  "inline-flex h-control-md items-center rounded-full px-4 type-control font-medium outline-none";

const LEGAL_PILL_IDLE_CLASS = TONES.neutral;

const LEGAL_PILL_ACTIVE_CLASS = TONES.chosen;

const LEGAL_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

const LEGAL_LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/;

const LEGAL = defineStage({
  parts: [
    "eyebrow",
    "title",
    "intro",
    "links",
    "rule",
    "index",
    "heading",
    "prose",
  ],
  sections: ["block"],
});

const sectionId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const bound = LEGAL;

const LegalStage = bound.StageRoot;
const LegalPart = bound.Part;
const LegalSection = bound.Section;
const LegalHeadline = bound.Text;

function LegalLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}): JSX.Element {
  return (
    <DockLink
      aria-current={active ? "page" : undefined}
      className={cn(
        LEGAL_PILL_BASE_CLASS,
        active ? LEGAL_PILL_ACTIVE_CLASS : LEGAL_PILL_IDLE_CLASS,
      )}
      href={href}
    >
      {label}
    </DockLink>
  );
}

function LegalLinks({ active }: { active: string | null }): JSX.Element {
  return (
    <nav aria-label="Legal" className="flex flex-wrap gap-2">
      {LEGAL_LINKS.map((link) => (
        <LegalLink
          active={active === link.href}
          href={link.href}
          key={link.href}
          label={link.label}
        />
      ))}
      <ExternalLink
        className={cn(LEGAL_PILL_BASE_CLASS, LEGAL_PILL_IDLE_CLASS)}
        href={`mailto:${LEGAL_CONTACT_EMAIL}`}
        target="_self"
      >
        Contact
      </ExternalLink>
    </nav>
  );
}

function AppLink({
  children,
  href,
}: {
  children: string;
  href: string;
}): JSX.Element {
  return (
    <DockLink href={href} variant="inline">
      {children}
    </DockLink>
  );
}

function LegalToken({ token }: { token: string }): JSX.Element {
  if (token.startsWith("**") && token.endsWith("**")) {
    return (
      <strong className="font-semibold text-ink">{token.slice(2, -2)}</strong>
    );
  }

  const link = LEGAL_LINK_PATTERN.exec(token);
  if (!link) return <>{token}</>;

  const [, label, href] = link;
  return href.startsWith("/") ? (
    <AppLink href={href}>{label}</AppLink>
  ) : (
    <ExternalLink href={href} variant="inline">
      {label}
    </ExternalLink>
  );
}

function LegalText({ text }: { text: string }): JSX.Element {
  return (
    <>
      {text.split(LEGAL_TOKEN_PATTERN).map((token, index) => (
        <LegalToken key={index} token={token} />
      ))}
    </>
  );
}

function LegalBlockView({
  block,
  index,
}: {
  block: LegalBlock;
  index: number;
}): JSX.Element {
  if (block.kind === "paragraph") {
    return (
      <LegalPart as="p" index={index} name="prose">
        <LegalText text={block.text} />
      </LegalPart>
    );
  }
  return (
    <LegalPart
      as="ul"
      className="flex list-disc flex-col gap-2 pl-5"
      index={index}
      name="prose"
    >
      {block.items.map((item) => (
        <li key={item}>
          <LegalText text={item} />
        </li>
      ))}
    </LegalPart>
  );
}

function LegalIndex({ document }: { document: LegalDocument }): JSX.Element {
  return (
    <nav aria-label="On this page" className="flex flex-col gap-4">
      <p className={`${TONE.label} text-ink-muted`}>On this page</p>
      <ol className="flex flex-col gap-2.5">
        {document.sections.map((section, index) => (
          <li className="flex gap-3 type-body" key={section.title}>
            <span className="w-5 shrink-0 text-ink-faint tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <a
              className={linkVariants({ variant: "quiet" })}
              href={`#${sectionId(section.title)}`}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LegalPage({
  document,
}: {
  document: LegalDocument;
}): JSX.Element {
  return (
    <LegalStage grade={null}>
      <main className={`ui-scene ${PAGE_CLASS}`}>
        <div className={`${CONTAINER_CLASS} pt-24 sm:pt-28 lg:pt-32`}>
          <header className="flex flex-col">
            <LegalPart
              name="eyebrow"
              as="p"
              className={`${TONE.label} text-ink-muted`}
            >
              Legal · Updated {LEGAL_LAST_UPDATED}
            </LegalPart>
            <div className="mt-8 sm:mt-10">
              <LegalHeadline
                part="title"
                text={document.title}
                as="h1"
                className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance text-ink uppercase sm:type-display-xl lg:type-display-2xl`}
              />
            </div>
            <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <LegalPart
                name="intro"
                as="p"
                className={cn(PROSE_CLASS, "max-w-[52ch] text-ink-body")}
              >
                {document.intro}
              </LegalPart>
              <LegalPart name="links">
                <LegalLinks active={document.path} />
              </LegalPart>
            </div>
          </header>

          <LegalPart
            className="mt-14 h-px w-full bg-line sm:mt-20"
            name="rule"
          />

          <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 pt-10 sm:pt-14 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
            <LegalPart
              as="aside"
              className="lg:sticky lg:top-fib-6"
              name="index"
            >
              <LegalIndex document={document} />
            </LegalPart>

            <article className={`flex flex-col divide-y ${TONE.rules}`}>
              {document.sections.map((section, index) => (
                <section
                  className="scroll-mt-24 py-10 first:pt-0 last:pb-0"
                  id={sectionId(section.title)}
                  key={section.title}
                >
                  <LegalSection
                    as="div"
                    cue="block"
                    className="flex flex-col gap-4"
                  >
                    <LegalPart
                      name="heading"
                      as="h2"
                      className="flex items-baseline gap-4 type-heading font-semibold text-ink"
                    >
                      <span
                        className={`${TONE.label} text-ink-faint tabular-nums`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.title}
                    </LegalPart>
                    <div
                      className={cn(
                        PROSE_CLASS,
                        "flex flex-col gap-4 text-ink-body",
                      )}
                    >
                      {section.blocks.map((block, blockIndex) => (
                        <LegalBlockView
                          block={block}
                          index={blockIndex}
                          key={blockIndex}
                        />
                      ))}
                    </div>
                  </LegalSection>
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>
    </LegalStage>
  );
}
