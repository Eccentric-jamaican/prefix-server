import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import type { BetterAuthOptions } from "better-auth";

const POLAR_USER_ADDITIONAL_FIELDS = {
  planKey: {
    type: "string",
    required: false,
    input: true
  },
  polarPlanId: {
    type: "string",
    required: false,
    input: true
  },
  polarProductId: {
    type: "string",
    required: false,
    input: true
  },
  polarBenefitId: {
    type: "string",
    required: false,
    input: true
  },
  polarCreditsPerCycle: {
    type: "number",
    required: false,
    input: true
  }
} as const;

const clientAuthOptions: Partial<BetterAuthOptions> = {
  user: {
    additionalFields: POLAR_USER_ADDITIONAL_FIELDS,
  },
};

export const authClient = createAuthClient({
  plugins: [convexClient()],
  ...clientAuthOptions,
});
