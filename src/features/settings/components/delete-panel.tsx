"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  createVerificationSurfaceEntry,
  getAuthCallbackUrl,
  getAuthErrorMessage,
  requestEmailAuth,
  useAuth,
} from "@/features/auth";
import { requestJson } from "@/infrastructure/http/client";
import {
  Button,
  SURFACE_TEXT,
  Icon,
  Input,
  SURFACE_DANGER,
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TILE,
  SURFACE_TITLE,
} from "@/ui";
import { INPUT_CLASS, Mark } from "./form";

const CONFIRMATION = "DELETE";

export function DeletePanel() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, openSurface } = useDockActions();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const email = auth.user?.email ?? "";
  const ready = confirmation === CONFIRMATION && Boolean(email);

  async function deleteAccount() {
    await requestJson("/api/account/me", {
      body: JSON.stringify({ confirmation: CONFIRMATION }),
      method: "DELETE",
    });
    await auth.signOut("local");
    closeSurface();
    router.replace("/?reason=account-deleted");
  }

  async function sendCode() {
    if (!ready || !auth.client) return;
    setSending(true);
    try {
      await requestEmailAuth(auth.client, {
        email,
        emailRedirectTo: getAuthCallbackUrl("/account"),
      });
      void openSurface(
        createVerificationSurfaceEntry(
          { email, onVerified: deleteAccount },
          { title: "Verify to delete" },
        ),
      );
    } catch (error) {
      toast(getAuthErrorMessage(error, "Couldn't send a verification code"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={SURFACE_STACK}>
      <div className={SURFACE_TILE}>
        <Mark icon="solar:danger-triangle-bold" tone="danger" />
        <span className={SURFACE_TEXT}>
          <span className={SURFACE_TITLE}>This can&apos;t be undone</span>
          <span className={SURFACE_META}>Your account is removed for good</span>
        </span>
      </div>
      <Input
        aria-label='Type "DELETE" to confirm'
        className={INPUT_CLASS}
        disabled={sending}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder='Type "DELETE" to confirm'
        value={confirmation}
      />
      <Button
        className={`${SURFACE_DANGER} w-full`}
        disabled={sending || !ready}
        loading={sending}
        onClick={sendCode}
      >
        <Icon icon="solar:letter-bold" size={16} />
        Send verification code
      </Button>
    </div>
  );
}
