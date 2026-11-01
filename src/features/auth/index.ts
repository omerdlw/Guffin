export {
  deletePasskey,
  getUserIdentities,
  linkIdentity,
  listPasskeys,
  registerPasskey,
  renamePasskey,
  requestEmailAuth,
  unlinkIdentity,
} from "./client";
export { OAUTH_PROVIDERS } from "./constants";
export { getAuthErrorMessage } from "./messages";
export { AuthProvider, useAuth } from "./provider";
export type { OAuthProvider } from "./types";
export { getAuthCallbackUrl } from "./utils";
export { AuthListener } from "./components/listener";
export { AUTH_INPUT_CLASS, createSignInSurfaceEntry } from "./surfaces/sign-in";
export { createVerificationSurfaceEntry } from "./surfaces/verification";
