import { action } from "./_generated/server.js";
import type { ActionCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api.js";
import { createCheckoutSession } from "./lib/polar.js";
import { POLAR_PLAN_DEFINITIONS, type PaidPlanKey } from "./lib/constants.js";

const paidPlanKeyValidator = v.union(
  v.literal("starter"),
  v.literal("growth"),
  v.literal("scale"),
);

export type CreateCheckoutSessionArgs = {
  accountId: Id<"accounts">;
  planKey: PaidPlanKey;
  successUrl: string;
  cancelUrl: string;
};

export async function handleCreateCheckoutSession(
  ctx: ActionCtx,
  args: CreateCheckoutSessionArgs,
) {
  const plan = POLAR_PLAN_DEFINITIONS[args.planKey];
  if (!plan) {
    throw new ConvexError({ code: "unknown_plan_key", planKey: args.planKey });
  }

  const membership = await ctx.runQuery(api.accounts.getAccountForCurrentUser, {});
  if (!membership) {
    throw new ConvexError({ code: "not_authenticated" });
  }

  if (membership.role !== "owner") {
    throw new ConvexError({ code: "insufficient_permissions", role: membership.role });
  }

  if (membership.accountId !== args.accountId) {
    throw new ConvexError({
      code: "account_mismatch",
      requestedAccountId: args.accountId,
      membershipAccountId: membership.accountId,
    });
  }

  const account = await ctx.runQuery(api.accounts.getAccountBillingContext, {
    accountId: membership.accountId,
  });

  if (!account) {
    throw new ConvexError({
      code: "account_not_found",
      accountId: membership.accountId,
    });
  }

  const session = await createCheckoutSession({
    productId: plan.productId,
    successUrl: args.successUrl,
    cancelUrl: args.cancelUrl,
    customerId: account.polarCustomerId ?? undefined,
    externalCustomerId: account.accountId,
    metadata: {
      planKey: args.planKey,
      planId: plan.planId,
      accountId: String(account.accountId),
    },
  });

  return {
    checkoutId: session.id,
    url: session.url,
  };
}

export const createCheckoutSessionAction = action({
  args: {
    accountId: v.id("accounts"),
    planKey: paidPlanKeyValidator,
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  returns: v.object({
    checkoutId: v.string(),
    url: v.string(),
  }),
  handler: handleCreateCheckoutSession,
});
