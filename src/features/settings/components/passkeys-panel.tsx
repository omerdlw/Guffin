"use client";

import { useState } from "react";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@/ui/cn";
import {
  deletePasskey,
  registerPasskey,
  renamePasskey,
  useAuth,
} from "@/features/auth";
import { Button, Icon, Input } from "@/ui";
import {
  INPUT_CLASS,
  ROW_BUTTON_CLASS,
  useSecurityTask,
  useSubmitClass,
} from "./form";

function PasskeysSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((index) => (
        <div
          className="flex h-10 w-full items-center justify-between rounded-card bg-fill p-1 pl-4 ring-1 ring-inset ring-edge"
          key={index}
        >
          <div className="h-3.5 w-28 rounded-full bg-fill-hover" />
          <div className="h-8 w-20 rounded-tile bg-fill-hover" />
        </div>
      ))}
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
  const submitClass = useSubmitClass();
  const run = useSecurityTask(reload);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (loading && passkeys.length === 0) return <PasskeysSkeleton />;

  return (
    <div className="flex flex-col gap-2.5">
      {passkeys.length === 0 ? (
        <div className="flex min-h-24 w-full items-center justify-center rounded-card bg-fill p-4 text-center">
          <span className="type-meta text-ink-muted">
            No passkeys registered
          </span>
        </div>
      ) : (
        passkeys.map((passkey) => {
          const name = passkey.friendly_name || "Passkey";
          if (editing?.id === passkey.id) {
            return (
              <div className="flex w-full flex-col gap-2.5" key={passkey.id}>
                <Input
                  autoFocus
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setEditing({ id: passkey.id, name: event.target.value })
                  }
                  placeholder="Passkey name"
                  value={editing.name}
                />
                <div className="flex w-full gap-2.5">
                  <Button
                    className={submitClass}
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
                  <Button
                    className="center size-10 shrink-0 cursor-pointer rounded-card bg-fill type-meta text-ink-body ring-1 ring-inset ring-edge hover:bg-fill-hover hover:text-ink"
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    <Icon icon="solar:close-bold" />
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div
              className="flex h-10 w-full items-center justify-between rounded-card bg-fill p-1 pl-4 text-ink ring-1 ring-inset ring-edge"
              key={passkey.id}
            >
              <span className="truncate type-body font-medium">{name}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  className={cn(
                    ROW_BUTTON_CLASS,
                    "text-ink-body hover:bg-fill-hover hover:text-ink disabled:opacity-50",
                  )}
                  disabled={pending}
                  onClick={() => setEditing({ id: passkey.id, name })}
                >
                  Rename
                </Button>
                <Button
                  className={cn(
                    ROW_BUTTON_CLASS,
                    "text-ink-body hover:bg-fill-hover disabled:opacity-50",
                    ACTION_TONE_CLASS,
                  )}
                  disabled={pending || !client}
                  onClick={() =>
                    client &&
                    run(
                      () => deletePasskey(client, passkey.id),
                      setPending,
                      "Passkey removed",
                      "Couldn't remove this passkey",
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })
      )}
      <Button
        className={submitClass}
        disabled={pending || !client}
        loading={pending}
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
        <Icon icon="solar:key-bold" size={16} />
        <span>Add passkey</span>
      </Button>
    </div>
  );
}
