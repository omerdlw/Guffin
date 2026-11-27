import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Coming back to the tab must not refetch the session: the cookie is the
  // truth, and another tab signing in or out reaches this one by broadcast.
  sessionOptions: { refetchOnWindowFocus: false },
  plugins: [emailOTPClient(), passkeyClient()],
});
