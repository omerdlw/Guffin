import type { JSX } from "react";
import { LEGAL_LAST_UPDATED } from "./constants";
import type { LegalDocument } from "./types";
import { LegalLinks } from "./components/links";
import { LegalText } from "./components/text";
import { PAGE_CLASS, TONE } from "@/ui";

export function LegalPage({
  document,
}: {
  document: LegalDocument;
}): JSX.Element {
  return (
    <main className={PAGE_CLASS}>
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6">
        <header className="flex flex-col items-center gap-4 pt-24 pb-10 text-center sm:pt-28">
          <h1 className="font-zuume type-display-sm leading-none font-bold uppercase sm:type-display-md">
            {document.title}
          </h1>
          <p className="max-w-xl type-body leading-7 text-ink-body">
            {document.intro}
          </p>
          <p className={`${TONE.label} text-ink-muted`}>
            Last updated {LEGAL_LAST_UPDATED}
          </p>
        </header>

        <LegalLinks active={document.path} />

        <article className="mt-6 flex flex-col gap-9 bg-fill p-6 ring-1 ring-edge ring-inset sm:p-8">
          {document.sections.map((section) => (
            <section className="flex flex-col gap-3" key={section.title}>
              <h2 className="type-title font-semibold text-ink">
                {section.title}
              </h2>
              <div className="flex flex-col gap-3 type-body leading-7 text-ink-body">
                {section.blocks.map((block, index) =>
                  block.kind === "paragraph" ? (
                    <p key={index}>
                      <LegalText text={block.text} />
                    </p>
                  ) : (
                    <ul
                      className="flex list-disc flex-col gap-2 pl-5"
                      key={index}
                    >
                      {block.items.map((item) => (
                        <li key={item}>
                          <LegalText text={item} />
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
