"use client";

import { useState } from "react";
import {
  Button,
  HighlightGroup,
  useHighlight,
} from "@omerdlw/base-framework/ui";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import {
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TILE_INNER,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { cn } from "@/design/ui";
import {
  deletePasskey,
  registerPasskey,
  renamePasskey,
} from "@/features/auth/client";
import { useAuth } from "@/features/auth/provider";
import { Mark, PanelNotice, PanelSkeleton, useSecurityTask } from "./panel";
import { INPUT_CLASS } from "./settings";

function PasskeyRow({
  disabled,
  id,
  name,
  onEdit,
  onRemove,
}: {
  disabled: boolean;
  id: string;
  name: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const highlight = useHighlight(id);
  return (
    <div
      className={cn(tileVariants(), "relative isolate")}
      {...highlight.props}
    >
      {highlight.node}
      <Mark icon="solar:key-bold" />
      <span className={SURFACE_TEXT}>
        <span className={SURFACE_TITLE}>{name}</span>
      </span>
      <span className="flex shrink-0 items-center">
        <Button
          aria-label={`Rename ${name}`}
          className={SURFACE_TILE_INNER}
          icon
          intent="ghost"
          size="chrome"
          disabled={disabled}
          onClick={onEdit}
        >
          <Icon icon="solar:pen-bold" size={16} />
        </Button>
        <Button
          aria-label={`Remove ${name}`}
          className={SURFACE_TILE_INNER}
          icon
          intent="ghost"
          size="chrome"
          disabled={disabled}
          onClick={onRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
        </Button>
      </span>
    </div>
  );
}

export function PasskeysPanel({
  loading,
  passkeys,
  reload,
}: {
  loading: boolean;
  passkeys: PasskeyListItem[];
  reload: () => Promise<void>;
}) {
  const { client } = useAuth();
  const run = useSecurityTask(reload);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (loading && passkeys.length === 0) return <PanelSkeleton />;

  return (
    <HighlightGroup className={SURFACE_STACK}>
      {passkeys.length === 0 ? (
        <PanelNotice icon="solar:key-bold" text="No passkeys registered" />
      ) : (
        passkeys.map((passkey) => {
          const name = passkey.friendly_name || "Passkey";
          if (editing?.id === passkey.id) {
            return (
              <div className={SURFACE_STACK} key={passkey.id}>
                <Input
                  aria-label="Passkey name"
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setEditing({ id: passkey.id, name: event.target.value })
                  }
                  placeholder="Passkey name"
                  value={editing.name}
                />
                <div className="flex w-full gap-2.5">
                  <Button
                    intent="neutral"
                    width="fill"
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    intent="primary"
                    width="fill"
                    disabled={pending || !editing.name.trim() || !client}
                    loading={pending}
                    onClick={() =>
                      client &&
                      run(
                        async () => {
                          await renamePasskey(
                            client,
                            passkey.id,
                            editing.name.trim(),
                          );
                          setEditing(null);
                        },
                        setPending,
                        "Passkey renamed",
                        "Couldn't rename this passkey",
                      )
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <PasskeyRow
              disabled={pending || !client}
              key={passkey.id}
              name={name}
              onEdit={() => setEditing({ id: passkey.id, name })}
              onRemove={() =>
                client &&
                run(
                  () => deletePasskey(client, passkey.id),
                  setPending,
                  "Passkey removed",
                  "Couldn't remove this passkey",
                )
              }
              id={passkey.id}
            />
          );
        })
      )}
      <Button
        intent="primary"
        width="full"
        disabled={pending || !client || editing !== null}
        loading={pending && editing === null}
        onClick={() =>
          client &&
          run(
            () => registerPasskey(client),
            setPending,
            "Passkey added",
            "Couldn't add a passkey",
          )
        }
      >
        <Icon icon="solar:add-circle-bold" size={16} />
        Add passkey
      </Button>
    </HighlightGroup>
  );
}
