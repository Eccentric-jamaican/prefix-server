import { mutation, query } from "./_generated/server.js";
import type { MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { ConvexError, v } from "convex/values";

import {
  DEFAULT_LOW_CREDIT_THRESHOLD,
  POLAR_PLAN_DEFINITIONS,
  TRIAL_CREDIT_GRANT,
  TRIAL_DURATION_MS,
  TRIAL_PLAN_ID,
  type PaidPlanKey
} from "./lib/constants.js";
import { adjustCreditBalance } from "./lib/ledger.js";

const paidPlanKeyValidator = v.union(
  v.literal("starter"),
  v.literal("growth"),
  v.literal("scale")
);

export const getAccountBillingContext = query({
  args: {
    accountId: v.id("accounts"),
  },
  returns: v.union(
    v.object({
      accountId: v.id("accounts"),
      planId: v.string(),
      polarCustomerId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return null;
    }

    return {
      accountId: account._id,
      planId: account.planId,
      polarCustomerId: account.polarCustomerId ?? undefined,
    };
  },
});

export async function handleCreateFromBetterAuth(
  ctx: MutationCtx,
  args: {
    betterAuthUserId: string;
    email: string;
    accountName: string;
    planKey?: PaidPlanKey;
  },
) {
  const now = Date.now();
  const planKey = args.planKey as PaidPlanKey | undefined;
  const selectedPlan = planKey ? POLAR_PLAN_DEFINITIONS[planKey] : undefined;

  const existingUser = await ctx.db
    .query("users")
    .withIndex("byBetterAuthUserId", (q) =>
      q.eq("betterAuthUserId", args.betterAuthUserId)
    )
    .unique();

  if (existingUser) {
    await ctx.db.patch(existingUser._id, { lastLoginAt: now });
    const account = await ctx.db.get(existingUser.accountId);
    if (!account) {
      throw new ConvexError({
        code: "account_missing_for_existing_user",
        userId: existingUser._id,
        accountId: existingUser.accountId
      });
    }

    return {
      accountId: existingUser.accountId,
      userId: existingUser._id,
      created: false,
      creditBalance: account.creditBalance
    };
  }

  const accountId = await ctx.db.insert("accounts", {
    name: args.accountName,
    planId: selectedPlan ? selectedPlan.planId : TRIAL_PLAN_ID,
    status: selectedPlan ? "active" : "trial",
    creditBalance: 0,
    lowCreditThreshold: DEFAULT_LOW_CREDIT_THRESHOLD,
    createdAt: now,
    updatedAt: now,
    ...(selectedPlan
      ? {
          polarProductId: selectedPlan.productId,
          polarBenefitId: selectedPlan.benefitId,
          creditsPerCycle: selectedPlan.creditsPerCycle,
          planAssignedAt: now
        }
      : {
          creditRefillAt: now + TRIAL_DURATION_MS
        })
  });

  const userId = await ctx.db.insert("users", {
    accountId,
    betterAuthUserId: args.betterAuthUserId,
    email: args.email,
    role: "owner",
    createdAt: now,
    lastLoginAt: now
  });

  await ctx.db.patch(accountId, { ownerUserId: userId });

  const ledger = await adjustCreditBalance({
    ctx,
    accountId,
    delta: selectedPlan ? selectedPlan.creditsPerCycle : TRIAL_CREDIT_GRANT,
    source: "plan_grant",
    notes: selectedPlan ? `${selectedPlan.planId} signup grant` : "Trial signup grant",
    metadata: {
      reason: selectedPlan ? "plan_signup" : "trial_signup",
      ...(selectedPlan
        ? {
            planKey,
            planId: selectedPlan.planId
          }
        : {})
    },
    now
  });

  return {
    accountId,
    userId,
    created: true,
    creditBalance: ledger.balance,
    ledgerEntryId: ledger.ledgerEntryId
  };
}

export const createFromBetterAuth = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    accountName: v.string(),
    planKey: v.optional(paidPlanKeyValidator)
  },
  returns: v.object({
    accountId: v.id("accounts"),
    userId: v.id("users"),
    created: v.boolean(),
    creditBalance: v.number(),
    ledgerEntryId: v.optional(v.id("creditLedger"))
  }),
  handler: handleCreateFromBetterAuth
});

type AssignPlanArgs = {
  accountId: Id<"accounts">;
  planKey: PaidPlanKey;
  polarCustomerId?: string;
  grantRequestId?: string;
  nowMs?: number;
};

export async function handleAssignPlan(
  ctx: MutationCtx,
  args: AssignPlanArgs,
) {
  const now = args.nowMs ?? Date.now();
  const planKey = args.planKey as PaidPlanKey;
  const plan = POLAR_PLAN_DEFINITIONS[planKey];

  if (!plan) {
    throw new ConvexError({ code: "unknown_plan_key", planKey });
  }

  const account = await ctx.db.get(args.accountId);
  if (!account) {
    throw new ConvexError({ code: "account_not_found", accountId: args.accountId });
  }

  await ctx.db.patch(args.accountId, {
    planId: plan.planId,
    status: "active",
    polarProductId: plan.productId,
    polarBenefitId: plan.benefitId,
    creditsPerCycle: plan.creditsPerCycle,
    planAssignedAt: now,
    updatedAt: now,
    ...(args.polarCustomerId ? { polarCustomerId: args.polarCustomerId } : {}),
    creditRefillAt: now
  });

  if (args.grantRequestId) {
    const existingLedger = await ctx.db
      .query("creditLedger")
      .withIndex("byAccountAndRequestId", (q) =>
        q.eq("accountId", args.accountId).eq("requestId", args.grantRequestId)
      )
      .unique();

    if (existingLedger) {
      const updatedAccount = await ctx.db.get(args.accountId);
      return {
        accountId: args.accountId,
        planId: plan.planId,
        status: "active" as const,
        creditBalance: updatedAccount?.creditBalance ?? account.creditBalance,
        ledgerEntryId: existingLedger._id
      };
    }
  }

  const grant = await adjustCreditBalance({
    ctx,
    accountId: args.accountId,
    delta: plan.creditsPerCycle,
    source: "plan_grant",
    requestId: args.grantRequestId,
    notes: `${plan.planId} activation grant`,
    metadata: {
      reason: "plan_activation",
      planKey,
      planId: plan.planId
    },
    now
  });

  return {
    accountId: args.accountId,
    planId: plan.planId,
    status: "active" as const,
    creditBalance: grant.balance,
    ledgerEntryId: grant.ledgerEntryId
  };
}

export const assignPlan = mutation({
  args: {
    accountId: v.id("accounts"),
    planKey: paidPlanKeyValidator,
    polarCustomerId: v.optional(v.string()),
    grantRequestId: v.optional(v.string()),
    nowMs: v.optional(v.number())
  },
  returns: v.object({
    accountId: v.id("accounts"),
    planId: v.string(),
    status: v.literal("active"),
    creditBalance: v.number(),
    ledgerEntryId: v.optional(v.id("creditLedger"))
  }),
  handler: handleAssignPlan
});
