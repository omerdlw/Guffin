"use client";

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DockSurfaceAction,
  DockSurfaceHeaderButton,
  useDockActions,
} from "@omerdlw/base-framework/dock";
import { useToast } from "@omerdlw/base-framework/notification";
import { Loader } from "@omerdlw/base-framework/ui";
import { Input } from "@/design/components/input";
import { defineSurface } from "@/design/surface/define";
import { useSurfacePreload } from "@/design/surface/lazy";
import {
  SurfacePart,
  SurfaceStage,
  useSurfacePart,
} from "@/design/surface/surface";
import { cn } from "@/design/ui";
import { accountSetupSurface } from "@/features/account/surfaces";
import { AnimatePresence, motion, useReducedMotion } from "@/motion/lib";
import {
  confirmEmailChange,
  hasAccountUsername,
  requestEmailChange,
  requestEmailCode,
  verifyEmailCode,
} from "../api";
import { getAuthErrorMessage } from "../errors";
import { sanitizeNextPath } from "../model";

interface VerificationData {
  email: string;
  purpose?: "change-email" | "sign-in";
  next?: string | null;
  onVerified?: () => Promise<void> | void;
}

interface OtpState {
  code: string;
  focused: boolean;
  invalid: boolean;
}

type VerificationBusy = "resending" | "submitting" | null;

interface OtpBoxesProps extends OtpState {
  disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCodeChange: (value?: string) => void;
  onFocusChange: (focused: boolean) => void;
}

interface VerificationSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data: VerificationData;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const ERROR_RESET_DELAY_MS = 700;
const VERIFICATION_SURFACE_WIDTH = 400;

const INITIAL_OTP_STATE: OtpState = {
  code: "",
  focused: false,
  invalid: false,
};

function normalizeOtpValue(value?: string): string {
  return (value ?? "").replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export const verificationSurface = defineSurface<{ data: VerificationData }>({
  component: VerificationSurface,
  description: ({ data }) => data.email,
  icon: "solar:shield-check-bold",
  title: ({ data }) =>
    data.purpose === "change-email" ? "Confirm email" : "Verify email",
  width: VERIFICATION_SURFACE_WIDTH,
});

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
  const row = useSurfacePart("row");
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="group/otp relative w-full"
      onClick={() => inputRef.current?.focus?.()}
    >
      <Input
        ref={inputRef}
        aria-label="Verification code"
        autoComplete="one-time-code"
        className="absolute inset-0 z-10 size-full cursor-text rounded-none bg-transparent px-0 py-0 text-transparent caret-transparent opacity-0 outline-none ring-0 focus:bg-transparent focus:ring-0"
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
      <motion.div
        animate={
          invalid && !shouldReduceMotion
            ? {
                x: [0, -8, 8, -5, 5, -2, 2, 0],
                transition: { duration: 0.38, ease: "easeInOut" },
              }
            : { x: 0 }
        }
        className="grid grid-cols-6 gap-2 @[280px]:gap-2.5 overflow-visible"
      >
        {Array.from({ length: OTP_LENGTH }).map((_, index) => {
          const digit = code[index] || "";
          const isActive = focused && activeIndex === index && !digit;
          const isFilled = Boolean(digit);

          return (
            <div
              {...row}
              key={`otp-box-${index}`}
              style={{ "--i": index } as CSSProperties}
              className={cn(
                "relative center h-control-lg rounded-inset select-none isolate",
                // Idle empty state
                !isFilled &&
                  !isActive &&
                  !invalid &&
                  "bg-fill text-ink-body ring-1 ring-edge ring-inset hover:bg-fill-hover hover:text-ink hover:ring-edge-hover",
                // Active focused empty slot
                isActive &&
                  !invalid &&
                  "bg-fill-hover text-ink ring-1 ring-edge-focus ring-inset",
                // Filled slot (valid)
                isFilled &&
                  !invalid &&
                  "bg-fill-active text-ink ring-1 ring-edge-focus ring-inset",
                // Invalid / error state
                invalid &&
                  "bg-fill-hover text-danger ring-1 ring-danger/40 ring-inset",
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {digit ? (
                  <motion.span
                    key={`digit-${digit}`}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.8 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.8 }
                    }
                    transition={{
                      duration: 0.12,
                      ease: [0.236, 0.382, 0.146, 1],
                    }}
                    className={cn(
                      "select-none font-semibold type-title tabular-nums",
                      invalid ? "text-danger" : "text-ink",
                    )}
                  >
                    {digit}
                  </motion.span>
                ) : isActive ? (
                  <span
                    aria-hidden="true"
                    className="h-4.5 w-0.5 rounded-full bg-ink-body"
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function VerificationSurface({ close, data }: VerificationSurfaceProps) {
  const toast = useToast();
  const { openSurface } = useDockActions();
  useSurfacePreload(accountSetupSurface);
  const { next, onVerified, purpose = "sign-in" } = data;
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      inputRef.current?.focus?.();
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  const resendCode = async () => {
    if (busy || !cooldown.canResend) return;

    setBusy("resending");
    try {
      if (purpose === "change-email") await requestEmailChange(email);
      else await requestEmailCode(email);
      setOtp(INITIAL_OTP_STATE);
      cooldown.restart();
      toast("Verification code sent to your email");
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
      if (purpose === "change-email") await confirmEmailChange(email, code);
      else await verifyEmailCode(email, code);

      if (onVerified) {
        await onVerified();
        close?.({ success: true });
      } else if (await hasAccountUsername()) {
        close?.({ success: true });
        window.location.replace(postAuthRedirect);
      } else {
        accountSetupSurface.open(openSurface);
      }
    } catch (error) {
      rejectCode(error);
    } finally {
      submission.current.inFlight = false;
      setBusy(null);
    }
  };

  const changeCode = (value?: string) => {
    if (resetErrorTimeout.current) {
      window.clearTimeout(resetErrorTimeout.current);
      resetErrorTimeout.current = null;
    }
    const code = normalizeOtpValue(value);
    setOtp({ code, focused: true, invalid: false });
    if (code.length === OTP_LENGTH) void completeVerification(code);
  };

  const resendLabel = cooldown.canResend
    ? "Resend"
    : `${cooldown.remainingSeconds}s`;

  return (
    <>
      <DockSurfaceAction>
        <DockSurfaceHeaderButton
          disabled={Boolean(busy) || !cooldown.canResend}
          onClick={resendCode}
        >
          {busy === "resending" ? <Loader>Resend</Loader> : resendLabel}
        </DockSurfaceHeaderButton>
      </DockSurfaceAction>

      <SurfaceStage className="px-3.5 py-1.5">
        <form
          aria-busy={Boolean(busy)}
          className="flex flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void completeVerification(otp.code);
          }}
        >
          <SurfacePart name="item">
            <OtpBoxes
              {...otp}
              disabled={Boolean(busy)}
              inputRef={inputRef}
              onCodeChange={changeCode}
              onFocusChange={(focused) =>
                setOtp((current) => ({ ...current, focused }))
              }
            />
          </SurfacePart>
        </form>
      </SurfaceStage>
    </>
  );
}
