"use client";

import type { JSX } from "react";
import { DockLink, ExternalLink } from "@/design/components/link";
import { PAGE_CLASS } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
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
  "flex-1 px-4 py-3 text-center type-body font-medium ring-1 ring-inset outline-none focus-visible:ring-edge-focus";

const LEGAL_PILL_IDLE_CLASS =
  "bg-fill text-ink-body ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink hover:ring-edge-hover focus-visible:ring-edge-focus";

const LEGAL_PILL_ACTIVE_CLASS = "bg-fill-hover text-ink ring-edge-hover";

const LEGAL_TOKEN_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

const LEGAL_LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/;

const LEGAL = defineStage({
  parts: ["title", "intro", "updated", "links", "sheet", "heading", "prose"],
  sections: ["block"],
});

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
    <nav aria-label="Legal" className="flex flex-col gap-2 sm:flex-row">
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

export function LegalPage({
  document,
}: {
  document: LegalDocument;
}): JSX.Element {
  return (
    <LegalStage grade={null}>
      <main className={`ui-scene ${PAGE_CLASS}`}>
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6">
          <header className="flex flex-col items-center gap-4 pt-24 pb-10 text-center sm:pt-28">
            <LegalHeadline
              part="title"
              text={document.title}
              as="h1"
              className="font-zuume type-display-sm leading-none font-bold uppercase sm:type-display-md"
            />
            <LegalPart
              name="intro"
              as="p"
              className="max-w-xl type-body leading-7 text-ink-body"
            >
              {document.intro}
            </LegalPart>
            <LegalPart
              name="updated"
              as="p"
              className={`${TONE.label} text-ink-muted`}
            >
              Last updated {LEGAL_LAST_UPDATED}
            </LegalPart>
          </header>

          <LegalPart name="links">
            <LegalLinks active={document.path} />
          </LegalPart>

          <LegalPart
            name="sheet"
            as="article"
            className="mt-6 flex flex-col gap-9 bg-fill p-6 ring-1 ring-edge ring-inset sm:p-8"
          >
            {document.sections.map((section) => (
              <LegalSection
                cue="block"
                className="flex flex-col gap-3"
                key={section.title}
              >
                <LegalPart
                  name="heading"
                  as="h2"
                  className="type-title font-semibold text-ink"
                >
                  {section.title}
                </LegalPart>
                <div className="flex flex-col gap-3 type-body leading-7 text-ink-body">
                  {section.blocks.map((block, index) => (
                    <LegalBlockView block={block} index={index} key={index} />
                  ))}
                </div>
              </LegalSection>
            ))}
          </LegalPart>
        </div>
      </main>
    </LegalStage>
  );
}
