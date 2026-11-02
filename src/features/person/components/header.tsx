"use client";

import { useId, useState } from "react";
import { LayoutGroup } from "motion/react";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { cn } from "@/ui/cn";
import { Button, Icon, PROSE_CLASS, RULE_GAP, TONE, Tooltip } from "@/ui";
import { SlidingHighlight } from "@/ui/sliding-highlight";
import { DetailExpose, DetailPart, DetailText } from "@/features/detail";
import { LINKS_CLASS, nameClass } from "../styles";
import type { SocialLink } from "../types";
import { createPersonBioSurfaceEntry } from "../surfaces/bio";

// Where a film has its tagline under the rule, a person has their trade and
// their profiles set along it.
function Rule({
  links,
  name,
  role,
}: {
  links: readonly SocialLink[];
  name: string;
  role: string | null;
}) {
  return (
    <div className={cn(RULE_GAP, "flex items-center gap-4")}>
      {role ? (
        <DetailExpose
          className={cn(TONE.label, "shrink-0 text-ink-body")}
          part="role"
          text={role}
        />
      ) : null}
      <DetailPart className="h-px min-w-6 flex-1 bg-grade/40" name="rule" />
      {links.length > 0 ? <Links links={links} name={name} /> : null}
    </div>
  );
}

function Links({
  links,
  name,
}: {
  links: readonly SocialLink[];
  name: string;
}) {
  const highlightGroupId = useId();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [focusedLink, setFocusedLink] = useState<string | null>(null);
  return (
    <LayoutGroup id={`person-links-${highlightGroupId}`}>
      <ul
        aria-label="Profiles"
        className={LINKS_CLASS}
        onBlurCapture={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setFocusedLink(null);
          }
        }}
        onPointerLeave={() => setHoveredLink(null)}
      >
        {links.map((link, index) => (
          <li className="relative isolate" key={link.key}>
            {(hoveredLink ?? focusedLink) === link.key ? (
              <SlidingHighlight
                className="rounded-full bg-fill-hover"
                layoutId="person-links-highlight"
              />
            ) : null}
            <DetailPart index={index} name="link">
              <Tooltip position="top" text={link.label}>
                <a
                  aria-label={`${name} on ${link.label}`}
                  className="cine-fade center relative z-10 size-9 rounded-full text-ink-body hover:text-ink focus-visible:text-ink"
                  href={link.url}
                  onFocus={() => setFocusedLink(link.key)}
                  onPointerEnter={() => setHoveredLink(link.key)}
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon icon={link.icon} size={20} />
                </a>
              </Tooltip>
            </DetailPart>
          </li>
        ))}
      </ul>
    </LayoutGroup>
  );
}

function Bio({
  excerpt,
  full,
  name,
  truncated,
}: {
  excerpt: string;
  full: string;
  name: string;
  truncated: boolean;
}) {
  const { openSurface } = useDockActions();

  const openFull = () => {
    void openSurface(createPersonBioSurfaceEntry({ biography: full, name }));
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <DetailText
        as="p"
        by="line"
        className={cn(PROSE_CLASS, "opacity-70")}
        part="overview"
        text={excerpt}
      />
      {truncated ? (
        <DetailPart name="link">
          <Button
            aria-label={`Read the full biography of ${name}`}
            className={`cursor-pointer ${TONE.link}`}
            onClick={openFull}
            type="button"
          >
            Read more
          </Button>
        </DetailPart>
      ) : null}
    </div>
  );
}

// The page's header: the name, the rule with the person's trade and profiles,
// and the start of their biography.
export function PersonHeader({
  biography,
  excerpt,
  links,
  name,
  role,
  truncated,
}: {
  biography: string | null;
  excerpt: string | null;
  links: readonly SocialLink[];
  name: string;
  role: string | null;
  truncated: boolean;
}) {
  return (
    <>
      <DetailText
        as="h1"
        className={nameClass(name)}
        mask
        part="title"
        text={name}
      />
      <Rule links={links} name={name} role={role} />
      {biography && excerpt ? (
        <Bio
          excerpt={excerpt}
          full={biography}
          name={name}
          truncated={truncated}
        />
      ) : null}
    </>
  );
}
