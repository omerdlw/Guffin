"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DockSurfaceAction,
  DockSurfaceHeaderButton,
  type SurfaceEntry,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { createAccountSetupSurfaceEntry } from "@/features/account/setup";
import { Input } from "@/design/components/input";
import { Loader } from "@/design/components/loader";
import { SurfaceAnchor } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { hasAccountUsername, requestEmailAuth, verifyEmailOtp } from "./client";
import {
  ERROR_RESET_DELAY_MS,
  INITIAL_OTP_STATE,
  OTP_BOX_STYLES,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} from "./constants";
import { SupabaseSetupNotice } from "./notice";
import { useAuth } from "./provider";
import type {
  OtpBoxesProps,
  OtpState,
  VerificationBusy,
  VerificationData,
  VerificationSurfaceProps,
} from "./types";
import {
  getAuthCallbackUrl,
  getAuthErrorMessage,
  normalizeOtpValue,
  sanitizeNextPath,
} from "./utils";
import styles from "./verification.module.css";

export function createVerificationSurfaceEntry(
  data: VerificationData,
  config: Partial<SurfaceEntry> = {},
): SurfaceEntry {
  return {
    component: VerificationSurface,
    props: { data },
    title: "Verify email",
    ...config,
  };
}

function useResendCooldown(cooldownSeconds: number) {
  const startCooldown = () => Date.now() + cooldownSeconds * 1000;
  const [availableAt, setAvailableAt] = useState(startCooldown);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil((availableAt - now) / 1000));

  const restart = useCallback(() => {
    setAvailableAt(Date.now() + cooldownSeconds * 1000);
    setNow(Date.now());
  }, [cooldownSeconds]);

  return { canResend: remainingSeconds === 0, remainingSeconds, restart };
}

function OtpBoxes({
  code,
  disabled,
  focused,
  inputRef,
  invalid,
  onCodeChange,
  onFocusChange,
}: OtpBoxesProps) {
  const activeIndex = Math.min(code.length, OTP_LENGTH - 1);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus?.()}>
      <Input
        ref={inputRef}
        aria-label="Verification code"
        autoComplete="one-time-code"
        className="absolute inset-0 z-10 size-full cursor-text rounded-none bg-transparent px-0 py-0 text-transparent opacity-0 outline-none ring-0 focus:bg-transparent focus:ring-0"
        disabled={disabled}
        inputMode="numeric"
        maxLength={OTP_LENGTH}
        onBlur={() => onFocusChange(false)}
        onChange={(event) => onCodeChange(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onPaste={(event) => {
          event.preventDefault();
          onCodeChange(event.clipboardData?.getData("text"));
        }}
        type="text"
        value={code}
      />
      <div className="grid grid-cols-6 gap-1.5 @[280px]:gap-2.5 overflow-visible">
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = code[index] || "";
          const isActive = focused && activeIndex === index;

          return (
            <div
              key={`otp-box-${index}`}
              className={cn(
                OTP_BOX_STYLES.BASE,
                invalid && digit && OTP_BOX_STYLES.ERROR,
                isActive && !digit && OTP_BOX_STYLES.ACTIVE,
                digit && !invalid && OTP_BOX_STYLES.SUCCESS,
              )}
            >
              {digit ? (
                <span className="ui-develop" key={digit}>
                  {digit}
                </span>
              ) : isActive ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    styles.caret,
                    "h-[1.1em] w-0.5 rounded-full bg-primary",
                  )}
                />
              ) : (
                <span className="invisible">0</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerificationSurface({ close, data }: VerificationSurfaceProps) {
  const auth = useAuth();
  const toast = useToast();
  const { openSurface } = useDockActions();
  const { next, onVerified } = data;
  const email = data.email.trim();
  const postAuthRedirect = sanitizeNextPath(next, "/account");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const submission = useRef({ inFlight: false, lastCode: "" });
  const resetErrorTimeout = useRef<number | null>(null);

  const [otp, setOtp] = useState<OtpState>(INITIAL_OTP_STATE);
  const [busy, setBusy] = useState<VerificationBusy>(null);
  const cooldown = useResendCooldown(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    return () => {
      if (resetErrorTimeout.current) {
        window.clearTimeout(resetErrorTimeout.current);
      }
    };
  }, []);

  const resendCode = async () => {
    if (busy || !cooldown.canResend || !auth.client) return;

    setBusy("resending");
    try {
      await requestEmailAuth(auth.client, {
        createUser: true,
        email,
        emailRedirectTo: getAuthCallbackUrl(postAuthRedirect),
      });
      setOtp(INITIAL_OTP_STATE);
      cooldown.restart();
    } catch (error) {
      toast(
        getAuthErrorMessage(
          error,
          "Couldn't send a new code. Please try again",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const rejectCode = (error: unknown) => {
    submission.current.lastCode = "";
    setOtp((current) => ({ ...current, invalid: true }));
    toast(
      getAuthErrorMessage(error, "That code didn't work. Please try again"),
    );

    if (resetErrorTimeout.current) {
      window.clearTimeout(resetErrorTimeout.current);
    }
    resetErrorTimeout.current = window.setTimeout(() => {
      setOtp(INITIAL_OTP_STATE);
      inputRef.current?.focus?.();
      resetErrorTimeout.current = null;
    }, ERROR_RESET_DELAY_MS);
  };

  const completeVerification = async (value: string) => {
    const code = normalizeOtpValue(value);
    if (
      !auth.client ||
      code.length !== OTP_LENGTH ||
      busy ||
      submission.current.inFlight ||
      submission.current.lastCode === code
    ) {
      return;
    }

    submission.current = { inFlight: true, lastCode: code };
    setBusy("submitting");

    try {
      await verifyEmailOtp(auth.client, email, code);

      if (onVerified) {
        await onVerified();
        close?.({ success: true });
      } else if (await hasAccountUsername()) {
        close?.({ success: true });
        window.location.replace(postAuthRedirect);
      } else {
        openSurface(createAccountSetupSurfaceEntry());
      }
    } catch (error) {
      rejectCode(error);
    } finally {
      submission.current.inFlight = false;
      setBusy(null);
    }
  };

  const changeCode = (value?: string) => {
    const code = normalizeOtpValue(value);
    setOtp((current) => ({ ...current, code }));
    if (code.length === OTP_LENGTH) void completeVerification(code);
  };

  if (!auth.isConfigured) return <SupabaseSetupNotice />;

  const resendLabel = cooldown.canResend
    ? "Resend"
    : `${cooldown.remainingSeconds}s`;

  return (
    <>
      <SurfaceAnchor />
      <DockSurfaceAction>
        <DockSurfaceHeaderButton
          disabled={Boolean(busy) || !cooldown.canResend}
          onClick={resendCode}
        >
          {busy === "resending" ? <Loader>Resend</Loader> : resendLabel}
        </DockSurfaceHeaderButton>
      </DockSurfaceAction>

      <form
        aria-busy={Boolean(busy)}
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          void completeVerification(otp.code);
        }}
      >
        <OtpBoxes
          {...otp}
          disabled={Boolean(busy)}
          inputRef={inputRef}
          onCodeChange={changeCode}
          onFocusChange={(focused) =>
            setOtp((current) => ({ ...current, focused }))
          }
        />
      </form>
    </>
  );
}
