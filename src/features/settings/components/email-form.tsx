"use client";

import { useState } from "react";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { getAuthErrorMessage, useAuth } from "@/features/auth";
import { Button, Input, SURFACE_STACK } from "@/ui";
import { useAccount } from "@/features/account";
import { INPUT_CLASS, SUBMIT_CLASS } from "./form";

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
        className={SUBMIT_CLASS}
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
