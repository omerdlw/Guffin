"use client";

import type { JSX } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { GuestOnly } from "./craft";
import { formatWhole } from "./format";
import { HomePart, HomeSection } from "./motion";

export function HomeJoin({ members }: { members: number }): JSX.Element {
  const openSignIn = useOpenSignIn();

  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="join">
        <HomePart className="h-px w-full bg-line" name="rule" />
        <HomePart
          className="grid grid-cols-1 items-end gap-x-16 gap-y-8 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          name="close"
        >
          <div className="flex flex-col gap-6">
            <p className={`${TONE.label} text-ink-muted`}>Roll credits</p>
            <h2
              className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance text-ink uppercase sm:type-display-xl lg:type-display-2xl`}
            >
              Start your diary tonight
            </h2>
          </div>
          <div className="flex flex-col items-start gap-6">
            <p className="max-w-[40ch] type-base leading-7 text-pretty text-ink-body">
              {members > 0
                ? `Join ${formatWhole(members)} members who keep track of what they watch.`
                : "Keep track of what you watch."}{" "}
              It’s free, and your first film takes a minute to log.
            </p>
            <Button
              intent="primary"
              onClick={openSignIn}
              shape="pill"
              size="lg"
            >
              Create your account
            </Button>
          </div>
        </HomePart>
      </HomeSection>
    </GuestOnly>
  );
}
