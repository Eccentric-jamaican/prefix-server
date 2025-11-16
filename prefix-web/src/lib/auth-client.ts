import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthOptions } from "better-auth";
import { POLAR_USER_ADDITIONAL_FIELDS } from "../../../shared/constants";

const clientAuthOptions = {
  user: {
    additionalFields: POLAR_USER_ADDITIONAL_FIELDS,
  },
} satisfies Partial<BetterAuthOptions>;

export const authClient = createAuthClient({
  plugins: [convexClient()],
  $InferAuth: clientAuthOptions,
});