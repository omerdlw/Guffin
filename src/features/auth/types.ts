import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { RefObject } from "react";
import type { Database } from "@/lib/supabase/database.types";

export type AuthClient = SupabaseClient<Database>;

export type OAuthProvider = "google" | "github" | "x";

export type SignOutScope = "local" | "global" | "others";

export interface AuthUser {
  aal: string;
  claims: Record<string, unknown>;
  email: string | null;
  id: string;
  sessionId: string | null;
}

export interface AuthState {
  error: unknown;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isReady: boolean;
  session: Session | null;
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  client: AuthClient | null;
  refresh: () => Promise<AuthState | null>;
  signOut: (scope?: SignOutScope) => Promise<void>;
}

export type MutationResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

export type SignInMethod = OAuthProvider | "email" | "passkey";

export interface SignInData {
  email?: string;
  next?: string | null;
}

export interface SignInSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data?: SignInData;
}

export type EmailResult =
  | { email: string; signedIn: boolean; success: true }
  | { error: string; success: false }
  | null;

export interface VerificationData {
  email: string;
  next?: string | null;
  onVerified?: () => Promise<void> | void;
}

export interface OtpState {
  code: string;
  focused: boolean;
  invalid: boolean;
}

export type VerificationBusy = "resending" | "submitting" | null;

export interface OtpBoxesProps extends OtpState {
  disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onCodeChange: (value?: string) => void;
  onFocusChange: (focused: boolean) => void;
}

export interface VerificationSurfaceProps {
  close?: (result?: { success?: boolean }) => void;
  data: VerificationData;
}
