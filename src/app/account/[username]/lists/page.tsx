import type { JSX } from "react";
import { readQuery, readSort, sortField } from "@/features/profile/filters";
import { LIST_SORTS } from "@/features/profile/lists/lists";
import { getListsPage } from "@/features/profile/lists/server";
import { ListsShelf } from "@/features/profile/lists/shelf";
import { ListsToolbar } from "@/features/profile/toolbar";
import { loadProfile } from "@/features/profile/server";
import type { SearchParams } from "@/lib/http";
import { accountHref } from "@/lib/project";

export default async function AccountListsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, isOwner, session, visible } = await loadProfile(username);
  if (!visible) return null;
  const sort = readSort(query, LIST_SORTS, "updated");
  const text = readQuery(query);
  const page = await getListsPage({
    accountId: account.id,
    query: text,
    session,
    sort,
  });

  if (page.items.length === 0 && !text && !isOwner) {
    return (
      <p className="py-fib-6 text-center type-body text-ink-muted">
        No lists yet
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-fib-5" data-section="lists">
      {page.items.length > 0 || text ? (
        <ListsToolbar
          base={`${accountHref(account.username)}/lists`}
          fields={[sortField(LIST_SORTS, sort, "updated")]}
          label="Search lists"
          placeholder="Search lists"
          query={text}
        />
      ) : null}
      <ListsShelf
        empty={
          text
            ? `No lists match “${text}”`
            : "Start a list here, or from any film page"
        }
        isOwner={isOwner}
        page={page}
        query={text}
        sort={sort}
        username={account.username}
      />
    </section>
  );
}
