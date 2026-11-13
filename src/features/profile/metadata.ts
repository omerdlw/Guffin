import type { Metadata } from "next";
import { project, shareMetadata } from "@/lib/project";
import { getAccountPageContext } from "./access";

export async function getAccountMetadata(username: string): Promise<Metadata> {
  const { account } = await getAccountPageContext(username);

  const title = account.displayName
    ? `${account.displayName} (@${account.username})`
    : `@${account.username}`;
  return shareMetadata({
    card: "summary",
    description:
      account.bio ||
      `View ${account.displayName || account.username}'s profile on ${project.name}.`,
    image: account.avatarUrl,
    title,
  });
}
