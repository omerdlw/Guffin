"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { AccountPart, useAccountStage } from "../motion";

// The view's own scope, so it can be put back in the dark on its own.
const VIEW = "view";

// The page under the tabs, played right behind the opening. By the time the
// path changes the router has already put the next tab's page in place, so
// there is nothing old left to hold back: the view goes dark and plays again.
export function AccountView({
  children,
  id,
}: {
  children: ReactNode;
  id: string;
}) {
  const stage = useAccountStage();
  const shown = useRef(id);

  useLayoutEffect(() => {
    if (shown.current === id) {
      stage.cue("view", VIEW);
      return;
    }
    shown.current = id;
    stage.recue("view", VIEW);
  }, [id, stage]);

  return (
    <AccountPart
      as="section"
      className="w-full pt-8 sm:pt-10"
      name="view"
      scope={VIEW}
    >
      {children}
    </AccountPart>
  );
}
