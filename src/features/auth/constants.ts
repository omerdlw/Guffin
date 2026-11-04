import type { AuthState, OAuthProvider, SignInMethod } from "./types";
import { SURFACE_FIELD, SURFACE_PRIMARY, surfaceButton } from "@/ui/tokens";

export const AUTH_CALLBACK_PATH = "/auth/callback";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = Object.freeze([
  "google",
  "github",
  "x",
]);

export const MAX_AUTH_AGE_SECONDS = 600;

export const SEED_EMAIL_DOMAIN = "seed.tvizzie.test";

export const INITIAL_AUTH_STATE: AuthState = Object.freeze({
  error: null,
  isAuthenticated: false,
  isConfigured: false,
  isReady: false,
  session: null,
  user: null,
});

export const AUTH_ERROR_CODES: Readonly<Record<string, string>> = Object.freeze(
  {
    otp_expired: "That code has expired or isn't valid. Request a new one",
    otp_disabled: "Email sign-in isn't available right now",
    email_address_invalid: "Enter a valid email address",
    email_address_not_authorized: "We can't send email to that address",
    validation_failed: "Check your details and try again",
    over_email_send_rate_limit:
      "Too many emails sent. Please wait a few minutes and try again",
    over_request_rate_limit:
      "Too many attempts. Please wait a moment and try again",
    over_sms_send_rate_limit:
      "Too many attempts. Please wait a moment and try again",
    signup_disabled: "New sign-ups are paused right now",
    user_banned: "This account has been suspended",
    email_exists: "That email is already linked to another account",
    user_already_exists: "That email is already linked to another account",
    identity_already_exists:
      "That account is already linked to another profile",
    single_identity_not_deletable:
      "Keep at least one sign-in method connected to this account",
    manual_linking_disabled: "Connecting accounts isn't available right now",
    provider_disabled: "That sign-in method isn't available right now",
    session_expired: "Your session has expired. Please sign in again",
    session_not_found: "Your session has expired. Please sign in again",
    reauthentication_needed:
      "For your security, please sign in again to continue",
    reauthentication_not_valid: "That code isn't valid. Request a new one",
    flow_state_expired: "That sign-in link has expired. Please try again",
    flow_state_not_found: "That sign-in link has expired. Please try again",
  },
);

export const WEBAUTHN_ERRORS: Readonly<Record<string, string>> = Object.freeze({
  NotAllowedError: "Passkey request was cancelled or timed out",
  AbortError: "Passkey request was cancelled",
  InvalidStateError: "This device already has a passkey for your account",
  NotSupportedError: "This device or browser doesn't support passkeys",
  SecurityError: "Passkeys can't be used on this site",
});

export const STATUS_DURATION_MS = 3000;

export const NOT_A_SEED_ACCOUNT = "This is not a test account";

export const SIGN_IN_SURFACE_WIDTH = 250;

export const REDIRECT_TIMEOUT_MS = 12000;

export const SIGN_IN_METHODS: Record<
  SignInMethod,
  { icon: string; label: string }
> = {
  email: { icon: "solar:letter-bold", label: "Email" },
  github: { icon: "mdi:github", label: "GitHub" },
  google: { icon: "flat-color-icons:google", label: "Google" },
  passkey: { icon: "solar:key-bold", label: "Passkey" },
  x: { icon: "simple-icons:x", label: "X" },
};

export const AUTH_INPUT_CLASS = `${SURFACE_FIELD} h-10 w-full px-4 type-body`;

export const SIGN_IN_PRIMARY_CLASS = `${SURFACE_PRIMARY} w-full disabled:cursor-not-allowed`;

export const SIGN_IN_SECONDARY_CLASS = `${surfaceButton(false)} w-full px-3`;

export const LEGAL_LINK_CLASS =
  "underline decoration-ink-faint underline-offset-2 hover:text-ink focus-visible:text-ink hover:decoration-ink-muted focus-visible:decoration-ink-muted";

export const OTP_LENGTH = 6;

export const RESEND_COOLDOWN_SECONDS = 60;

export const ERROR_RESET_DELAY_MS = 700;

export const AUTO_FOCUS_DELAY_MS = 150;

export const OTP_BOX_STYLES = {
  BASE: "center h-11 @[280px]:h-14 rounded-card type-base @[280px]:type-title font-semibold text-ink-body ring-1 ring-inset ring-edge hover:text-ink focus-visible:text-ink",
  ERROR:
    "bg-fill-hover text-ink ring-edge-focus hover:bg-fill-active focus-visible:bg-fill-active",
  ACTIVE:
    "bg-fill text-ink ring-edge-hover hover:bg-fill-hover focus-visible:bg-fill-hover",
  SUCCESS: "bg-fill-active text-ink ring-edge-focus",
};
