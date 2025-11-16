import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import type { MiddlewareContext } from "better-call";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import {
  POLAR_USER_ADDITIONAL_FIELDS,
  type PaidPlanKey,
} from "../shared/constants.js";
import { betterAuth } from "better-auth";
import { api } from "./_generated/api.js";
import { ConvexHttpClient } from "convex/browser";

const isPaidPlanKey = (value: unknown): value is PaidPlanKey =>
  value === "starter" || value === "growth" || value === "scale";

const siteUrl = process.env.SITE_URL;
const convexSiteUrl = process.env.CONVEX_SITE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!siteUrl) {
  throw new Error("SITE_URL is not configured for Convex Better Auth.");
}

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is not configured in Convex env.");
}

const trustedOrigins = [siteUrl, convexSiteUrl].filter(
  (url): url is string => Boolean(url),
);

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

const baseAuthOptions = {
  secret: betterAuthSecret,
  baseURL: siteUrl,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: POLAR_USER_ADDITIONAL_FIELDS,
  },
  plugins: [convex()],
  hooks: {
    after: async (input) => {
      const ctx = input as MiddlewareContext<any, any>;
      console.log("[BetterAuth after hook] invoked", {
        path: ctx.path,
        method: ctx.method,
        hasReturned: Boolean((ctx.context as any)?.returned),
      });

      if (ctx.path !== "/sign-up/email" || ctx.method !== "POST") {
        return;
      }

      const betterAuthCtx = ctx.context as typeof ctx.context & {
        returned?: unknown;
        request?: Request;
      };

      const signUpResult = betterAuthCtx.returned;
      console.log("[BetterAuth after hook] raw signUpResult", signUpResult);
      if (!signUpResult || typeof signUpResult !== "object") {
        return;
      }

      if ("headers" in signUpResult) {
        console.log("[BetterAuth after hook] Received Response-like result, skipping mutation");
        return;
      }

      const payload = { ...(signUpResult as Record<string, unknown>) };
      const userData = payload && typeof payload.user === "object" && payload.user !== null
        ? (payload.user as Record<string, unknown>)
        : null;
      const userId = userData && typeof userData.id === "string" ? userData.id : undefined;

      if (!userId) {
        console.log("[BetterAuth after hook] missing userId", { userData });
        return;
      }

      const email = userData && typeof userData.email === "string" ? userData.email : undefined;
      const name = userData && typeof userData.name === "string" ? userData.name : undefined;
      const rawPlanKey = userData && typeof (userData as Record<string, unknown>).planKey === "string"
        ? (userData as Record<string, unknown>).planKey
        : undefined;
      const planKey = isPaidPlanKey(rawPlanKey) ? rawPlanKey : undefined;

      if (!email || !name) {
        console.log("[BetterAuth after hook] missing email or name", { email, name });
        return;
      }

      console.log("[BetterAuth after hook] invoking createFromBetterAuth", {
        userId,
        email,
        name,
        planKey,
      });

      const deploymentUrl =
        process.env.CONVEX_URL ??
        process.env.NEXT_PUBLIC_CONVEX_URL ??
        process.env.CONVEX_DEPLOYMENT_URL;
      const convexUrl = deploymentUrl && deploymentUrl.endsWith(".convex.site")
        ? deploymentUrl.replace(/\.convex\.site$/, ".convex.cloud")
        : deploymentUrl;

      if (!convexUrl) {
        console.log("[BetterAuth after hook] missing Convex URL", {
          deploymentUrl,
          convexUrl,
        });
        return;
      }

      console.log("[BetterAuth after hook] using Convex deployment URL", { convexUrl });
      const convexClient = new ConvexHttpClient(convexUrl);

      const result = await convexClient.mutation(
        (api as any).accounts.createFromBetterAuth,
        {
          betterAuthUserId: userId,
          email,
          accountName: name,
          planKey,
        },
      );

      if (payload) {
        console.log("[BetterAuth after hook] received mutation result", result);
        payload.accountId = result.accountId;
        betterAuthCtx.returned = payload;
        console.log("[BetterAuth after hook] patched payload", payload);
      }
    },
  },
} satisfies Parameters<typeof betterAuth>[0];

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  const options = {
    ...baseAuthOptions,
    logger: {
      disabled: optionsOnly,
    },
    database: authComponent.adapter(ctx),
  };

  return betterAuth(options);
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx: GenericCtx<DataModel>) => {
    return authComponent.getAuthUser(ctx);
  },
});
