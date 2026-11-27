"use client";

import { useState } from "react";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button } from "@omerdlw/base-framework/ui";
import { useRouter } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import {
  SURFACE_META,
  SURFACE_STACK,
  SURFACE_TEXT,
  SURFACE_TITLE,
  tileVariants,
} from "@/design/surface/classes";
import { useSurfacePreload } from "@/design/surface/lazy";
import { useAccount } from "@/features/account/provider";
import { requestEmailChange, requestEmailCode } from "@/features/auth/api";
import { getAuthErrorMessage } from "@/features/auth/errors";
import { useAuth } from "@/features/auth/provider";
import { verificationSurface } from "@/features/auth/surfaces";
import { requestJson } from "@/shared/http";
import { Mark } from "./panel";
import { INPUT_CLASS } from "./model";

const DELETE_CONFIRMATION = "DELETE";

export function EmailForm() {
  const { account, refresh } = useAccount();
  const { openSurface } = useDockActions();
  useSurfacePreload(verificationSurface);
  const toast = useToast();
  const currentEmail = account?.email?.trim() ?? "";
  const [email, setEmail] = useState(currentEmail);
  const [pending, setPending] = useState(false);

  async function updateEmail() {
    setPending(true);
    try {
      const target = await requestEmailChange(email);
      void verificationSurface.open(
        openSurface,
        {
          data: {
            email: target,
            onVerified: async () => {
              await refresh();
              toast("Email updated");
            },
            purpose: "change-email",
          },
        },
        { title: "Verify new email" },
      );
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
        disabled={pending || !email.trim() || email.trim() === currentEmail}
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
  useSurfacePreload(verificationSurface);
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
    if (!ready) return;
    setSending(true);
    try {
      await requestEmailCode(email);
      void verificationSurface.open(
        openSurface,
        { data: { email, onVerified: deleteAccount } },
        { title: "Verify to delete" },
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
