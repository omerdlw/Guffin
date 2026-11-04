"use client";

import { Fragment, type JSX } from "react";
import Link from "next/link";
import { bindScore } from "@/motion/react";
import { defineScore } from "@/motion/score";
import { useDockLinkClick } from "@/ui/button";
import { cn } from "@/ui/cn";
import { PAGE_CLASS, TONE } from "@/ui/tokens";
import {
  BASE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LEGAL_LINKS,
  LINK,
  LINK_CLASS,
  TOKEN,
} from "./constants";
import type { LegalDocument } from "./types";

const LEGAL = defineScore({
  tempo: -1,
  cast: {
    title: "ink",
    intro: "light",
    updated: "light",
    links: "glass",
    sheet: { matter: "paper", leave: "fade" },
    heading: "ink",
    prose: { matter: "ink", leave: "fade" },
  },
  opening: ["title", ["intro", "updated"], "links", "sheet"],
  sections: { block: ["heading", "prose"] },
});

const bound = bindScore(LEGAL);

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
  const onClick = useDockLinkClick(href);
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        BASE,
        active
          ? "bg-fill-hover text-ink ring-edge-hover"
          : "bg-fill text-ink-body ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink hover:ring-edge-hover focus-visible:ring-edge-focus",
      )}
      href={href}
      onClick={onClick}
      prefetch={false}
    >
      {label}
    </Link>
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
      <a
        className={cn(
          BASE,
          "bg-fill text-ink-body ring-edge hover:bg-fill-hover focus-visible:bg-fill-hover hover:text-ink focus-visible:text-ink hover:ring-edge-hover focus-visible:ring-edge-focus",
        )}
        href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      >
        Contact
      </a>
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
  const onClick = useDockLinkClick(href);
  return (
    <Link className={LINK_CLASS} href={href} onClick={onClick} prefetch={false}>
      {children}
    </Link>
  );
}

function LegalText({ text }: { text: string }): JSX.Element {
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong className="font-semibold text-ink" key={index}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = LINK.exec(part);
        if (link) {
          const [, label, href] = link;
          return href.startsWith("/") ? (
            <AppLink href={href} key={index}>
              {label}
            </AppLink>
          ) : (
            <a className={LINK_CLASS} href={href} key={index}>
              {label}
            </a>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
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
              mask
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
                  {section.blocks.map((block, index) =>
                    block.kind === "paragraph" ? (
                      <LegalPart name="prose" as="p" index={index} key={index}>
                        <LegalText text={block.text} />
                      </LegalPart>
                    ) : (
                      <LegalPart
                        name="prose"
                        as="ul"
                        index={index}
                        key={index}
                        className="flex list-disc flex-col gap-2 pl-5"
                      >
                        {block.items.map((item) => (
                          <li key={item}>
                            <LegalText text={item} />
                          </li>
                        ))}
                      </LegalPart>
                    ),
                  )}
                </div>
              </LegalSection>
            ))}
          </LegalPart>
        </div>
      </main>
    </LegalStage>
  );
}
