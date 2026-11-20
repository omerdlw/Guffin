"use server";
import "server-only";

import { loadProfile } from "../server";
import {
  ACTIVITY_GROUPS,
  type ActivityGroup,
  type ActivityPage,
} from "./activity";
import { getActivityPage } from "./server";

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
    group: group in ACTIVITY_GROUPS ? group : "all",
    offset: Math.max(0, Math.floor(offset) || 0),
    session,
  });
}
