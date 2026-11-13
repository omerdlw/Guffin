"use client";

import { useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { useRouter } from "next/navigation";
import { useAccount } from "@/features/account/provider";
import { requestEmailAuth } from "@/features/auth/client";
import { useAuth } from "@/features/auth/provider";
import { getAuthCallbackUrl, getAuthErrorMessage } from "@/features/auth/utils";
import { createVerificationSurfaceEntry } from "@/features/auth/verification";
import { requestJson } from "@/lib/http";
import { Button } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/components/surface-classes";
import { DELETE_CONFIRMATION, INPUT_CLASS } from "./constants";
import { Mark } from "./shared";

export function EmailForm() {
  const auth = useAuth();
  const { account } = useAccount();
  const toast = useToast();
  const currentEmail = account?.email?.trim() ?? "";
  const [email, setEmail] = useState(currentEmail);
  const [pending, setPending] = useState(false);

  async function updateEmail() {
    if (!auth.client) return;
    setPending(true);
    try {
      const { error } = await auth.client.auth.updateUser({ email });
      if (error) throw error;
      toast("Check your inbox to confirm the new email");
    } catch (error) {
      toast(getAuthErrorMessage(error, "Couldn't update your email"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={SURFACE_STACK}>
      <Input
        aria-label="New email"
        className={INPUT_CLASS}
        disabled={pending}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="New email"
        type="email"
        value={email}
      />
      <Button
        intent="primary"
        width="full"
        disabled={
          pending ||
          !auth.client ||
          !email.trim() ||
          email.trim() === currentEmail
        }
        loading={pending}
        onClick={updateEmail}
      >
        Verify and update email
      </Button>
    </div>
  );
}

export function DeletePanel() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, openSurface } = useDockActions();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const email = auth.user?.email ?? "";
  const ready = confirmation === DELETE_CONFIRMATION && Boolean(email);

  async function deleteAccount() {
    await requestJson("/api/account/me", {
      body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
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
      <div className={tileVariants()}>
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
        intent="danger"
        width="full"
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
