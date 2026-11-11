"use client";

import type { JSX, ReactNode } from "react";
import { useAuth } from "@/features/auth/provider";
import { Icon } from "@/design/components/icon";
import { TONE } from "@/design/foundations/tones";
import { CRAFT } from "./constants";
import { Heading, HomePart, HomeSection } from "./motion";

export function GuestOnly({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return auth.isAuthenticated ? null : children;
}

export function HomeCraft(): JSX.Element {
  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="craft">
        <Heading title="What you can do here" />
        <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {CRAFT.map((item, index) => (
            <HomePart
              as="li"
              className="flex min-w-0 flex-col gap-4 border-t border-rule py-8"
              index={index}
              key={item.verb}
              name="verb"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`${TONE.label} text-ink-faint tabular-nums`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon className="text-ink-muted" icon={item.icon} size={18} />
              </div>
              <h3 className="font-zuume type-display-sm leading-none font-bold text-ink uppercase">
                {item.verb}
              </h3>
              <p className="max-w-[36ch] type-copy text-pretty text-ink-body">
                {item.text}
              </p>
            </HomePart>
          ))}
        </ol>
      </HomeSection>
    </GuestOnly>
  );
}
