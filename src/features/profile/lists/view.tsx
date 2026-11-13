import type { JSX } from "react";
import { resolveVitrin } from "@/features/media/server";
import { MEDIA_TYPE_COPY } from "@/features/media/vitrin";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { ResultsView } from "@/features/profile/blocks";
import { FilterBar } from "@/features/profile/filter-bar";
import { readPageParam } from "@/features/profile/params";
import {
  type AccountViewProps,
  LIST_SORTS,
  type ListSort,
  pickOption,
} from "@/features/profile/profile";
import { readParam, type SearchParams } from "@/lib/http";
import { ListRows, ListsChrome } from "./lists";
import { getListsPage } from "./server";

function parseListSort(params: SearchParams | undefined): ListSort {
  return pickOption(readParam(params, "sort"), LIST_SORTS, "updated_desc");
}

export async function AccountListsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const mediaType = await resolveVitrin(query);
  const result = await getListsPage({
    accountId: account.id,
    client,
    mediaType,
    page: readPageParam(query),
    sort: parseListSort(query),
  });

  return (
    <ResultsView
      empty={
        result.items.length > 0
          ? null
          : {
              icon: "solar:list-bold",
              message: isOwner
                ? `Start a list here, or from any ${MEDIA_TYPE_COPY[mediaType].singular} page`
                : "No lists yet",
            }
      }
      paging={result}
      toolbar={
        <>
          <ListsChrome
            isOwner={isOwner}
            mediaType={mediaType}
            username={account.username}
          />
          {result.total > 1 ? (
            <FilterBar
              fields={[
                {
                  defaultValue: "updated_desc",
                  key: "sort",
                  options: LIST_SORTS,
                },
              ]}
              searchPlaceholder={null}
            />
          ) : null}
        </>
      }
    >
      <ListRows
        lists={result.items}
        ownerEdit={isOwner}
        username={account.username}
      />
    </ResultsView>
  );
}
