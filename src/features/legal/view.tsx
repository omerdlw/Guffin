import type { JSX } from "react";
import { LEGAL_LAST_UPDATED } from "./constants";
import type { LegalDocument } from "./types";
import { LegalLinks } from "./components/links";
import { LegalText } from "./components/text";
import { LegalHeadline, LegalPart, LegalSection, LegalStage } from "./motion";
import { PAGE_CLASS, TONE } from "@/ui";

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
