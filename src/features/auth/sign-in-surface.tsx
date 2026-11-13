"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { DOCK_EVENTS, useDockActions } from "@omerdlw/base-framework/dock";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import { Button, Spinner } from "@omerdlw/base-framework/ui";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { Input } from "@/design/components/input";
import { Link } from "@/design/components/link";
import { SurfaceAnchor } from "@/design/components/surface";
import { useSurfacePreload } from "@/design/lazy-surface";
import { defineSurface } from "@/design/surface-definition";
import {
  requestEmailAuth,
  signInSeedAccount,
  signInWithOAuth,
  signInWithPasskey,
} from "./client";
import { getAuthErrorMessage } from "./errors";
import { SupabaseSetupNotice } from "./notice";
import { useAuth } from "./provider";
import {
  getAuthCallbackUrl,
  OAUTH_PROVIDERS,
  type OAuthProvider,
  sanitizeNextPath,
  SEED_EMAIL_DOMAIN,
} from "./session";
import { AUTH_INPUT_CLASS } from "./sign-in";
import { verificationSurface } from "./surfaces";

type SignInMethod = OAuthProvider | "email" | "passkey";

interface SignInData {
  email?: string;
  next?: string | null;
}

interface SignInSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: SignInData;
}

type EmailResult =
  | { email: string; signedIn: boolean; success: true }
  | { error: string; success: false }
  | null;

const SIGN_IN_SURFACE_WIDTH = 250;

const REDIRECT_TIMEOUT_MS = 12000;

const SIGN_IN_METHODS: Record<SignInMethod, { icon: string; label: string }> = {
  email: { icon: "solar:letter-bold", label: "Email" },
  github: { icon: "mdi:github", label: "GitHub" },
  google: { icon: "flat-color-icons:google", label: "Google" },
  passkey: { icon: "solar:key-bold", label: "Passkey" },
  x: { icon: "simple-icons:x", label: "X" },
};

function isSeedEmail(email: string): boolean {
  return (
    process.env.NEXT_PUBLIC_SEED_LOGIN === "1" &&
    email.trim().toLowerCase().endsWith(`@${SEED_EMAIL_DOMAIN}`)
  );
}

function showSigningIn(description: string) {
  globalEvents.emit(DOCK_EVENTS.STATUS_SET, {
    description,
    duration: 0,
    flow: "login",
    icon: <Spinner size={24} />,
    priority: 110,
    themeType: "LOGIN",
    title: "Signing In",
    type: "LOGIN",
  });
}

function clearSigningIn() {
  globalEvents.emit(DOCK_EVENTS.STATUS_CLEAR, { flow: "login", type: "LOGIN" });
}

function usePostAuthRedirect(next?: string | null): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const query = searchParams.toString();
    const current = `${pathname || "/"}${query ? `?${query}` : ""}`;
    return sanitizeNextPath(next || current, "/");
  }, [next, pathname, searchParams]);
}

function MethodButton({
  busy,
  disabled,
  method,
  onSelect,
  primary = false,
}: {
  busy: boolean;
  disabled: boolean;
  method: SignInMethod;
  onSelect: (method: SignInMethod) => void;
  primary?: boolean;
}) {
  const { icon, label } = SIGN_IN_METHODS[method];
  return (
    <Button
      aria-label={`Continue with ${label}`}
      intent={primary ? "primary" : "neutral"}
      width="full"
      disabled={disabled}
      loading={busy}
      onClick={() => onSelect(method)}
    >
      <Icon className="shrink-0" icon={icon} size={16} />
      <span className="truncate">
        {primary ? `Continue with ${label}` : label}
      </span>
    </Button>
  );
}

function SignInSurface({ close, data = {} }: SignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  const toast = useToast();
  const [active, setActive] = useState<SignInMethod | null>(null);
  const redirectTimer = useRef<number | null>(null);
  const postAuthRedirect = usePostAuthRedirect(data.next);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  async function startSignIn(method: OAuthProvider | "passkey") {
    if (!auth.client) return;
    setActive(method);
    showSigningIn(
      method === "passkey"
        ? "Preparing passkey sign-in"
        : `Redirecting to ${SIGN_IN_METHODS[method].label} sign-in`,
    );

    let redirecting = false;
    try {
      if (method === "passkey") {
        await signInWithPasskey(auth.client);
        close?.({ success: true });
        window.location.replace(postAuthRedirect);
        return;
      }
      await signInWithOAuth(
        auth.client,
        method,
        getAuthCallbackUrl(postAuthRedirect),
      );
      redirecting = true;
      redirectTimer.current = window.setTimeout(
        clearSigningIn,
        REDIRECT_TIMEOUT_MS,
      );
    } catch (error) {
      clearSigningIn();
      toast(
        getAuthErrorMessage(error, "Couldn't sign you in. Please try again"),
      );
    } finally {
      if (!redirecting) setActive(null);
    }
  }

  function selectMethod(method: SignInMethod) {
    if (active) return;
    if (method === "email") {
      openSurface(
        emailSignInSurface({
          data: { email: data.email?.trim(), next: postAuthRedirect },
        }),
      );
      return;
    }
    void startSignIn(method);
  }

  if (!auth.isConfigured) return <SupabaseSetupNotice />;

  return (
    <div className="flex flex-col gap-2.5">
      <SurfaceAnchor />
      <MethodButton
        busy={active === "passkey"}
        disabled={Boolean(active)}
        method="passkey"
        onSelect={selectMethod}
        primary
      />
      <div className="grid w-full grid-cols-2 gap-2.5">
        {(["email", ...OAUTH_PROVIDERS] as const).map((method) => (
          <MethodButton
            busy={active === method}
            disabled={Boolean(active)}
            key={method}
            method={method}
            onSelect={selectMethod}
          />
        ))}
      </div>
      <p className="px-4 pt-0.5 text-center type-label text-balance text-ink-muted">
        By continuing you agree to the{" "}
        <Link
          variant="inline"
          href="/terms"
          onClick={() => close?.()}
          prefetch={false}
        >
          Terms
        </Link>{" "}
        and the{" "}
        <Link
          variant="inline"
          href="/privacy"
          onClick={() => close?.()}
          prefetch={false}
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function EmailSignInSurface({ data = {} }: SignInSurfaceProps) {
  const auth = useAuth();
  const { openSurface } = useDockActions();
  useSurfacePreload(verificationSurface);
  const toast = useToast();
  const [email, setEmail] = useState(() => data.email?.trim() ?? "");
  const postAuthRedirect = usePostAuthRedirect(data.next);

  const [result, submit, pending] = useActionState<EmailResult, FormData>(
    async () => {
      const target = email.trim();
      if (!target) return { error: "Email is required", success: false };
      try {
        if (isSeedEmail(target)) {
          await signInSeedAccount(target);
          window.location.replace(postAuthRedirect);
          return { email: target, signedIn: true, success: true };
        }
        if (!auth.client) throw new Error("Authentication is not configured");
        await requestEmailAuth(auth.client, {
          createUser: true,
          email: target,
        });
        return { email: target, signedIn: false, success: true };
      } catch (error) {
        return {
          error: getAuthErrorMessage(
            error,
            "Couldn't send your code. Please try again",
          ),
          success: false,
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    if (!result.success) {
      toast(result.error);
      return;
    }
    if (!result.signedIn) {
      verificationSurface.open(openSurface, {
        data: { email: result.email, next: postAuthRedirect },
      });
    }
  }, [openSurface, postAuthRedirect, result, toast]);

  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <SurfaceAnchor />
      <Input
        aria-label="Email"
        autoComplete="email"
        className={AUTH_INPUT_CLASS}
        disabled={pending}
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        type="email"
        value={email}
      />
      <Button
        intent="primary"
        width="full"
        disabled={pending}
        loading={pending}
        type="submit"
      >
        <span className="truncate">Continue with email</span>
      </Button>
    </form>
  );
}

const emailSignInSurface = defineSurface<{ data: SignInData }>({
  component: EmailSignInSurface,
  title: "Sign In",
  width: SIGN_IN_SURFACE_WIDTH,
});

export const signInSurface = defineSurface<{ data: SignInData }>({
  component: SignInSurface,
  title: "Sign In",
  width: SIGN_IN_SURFACE_WIDTH,
});
