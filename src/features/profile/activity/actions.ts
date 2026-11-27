"use server";
import "server-only";

import { isKeyOf, readOffset } from "@/shared/http";
import { loadProfile } from "../queries";
import {
  ACTIVITY_GROUPS,
  type ActivityGroup,
  type ActivityPage,
} from "./model";
import { getActivityPage } from "./queries";

export async function loadActivityPage({
  group,
  offset,
  username,
}: {
  group: ActivityGroup;
  offset: number;
  username: string;
}): Promise<ActivityPage> {
  const { account, session } = await loadProfile(username);
  return getActivityPage({
    account,
    group: isKeyOf(ACTIVITY_GROUPS, group) ? group : "all",
    offset: readOffset(offset),
    session,
  });
}
