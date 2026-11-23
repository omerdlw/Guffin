export type OAuthProvider = "google" | "github" | "x";

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = Object.freeze([
  "google",
  "github",
  "x",
]);

export const AUTH_COOKIE_PREFIX = "guffin";
