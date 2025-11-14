import { mutation } from "./_generated/server.js";
import { ConvexError, v } from "convex/values";

import {
  DEFAULT_LOW_CREDIT_THRESHOLD,
  TRIAL_CREDIT_GRANT,
  TRIAL_DURATION_MS,
  TRIAL_PLAN_ID
} from "./lib/constants.js";
import { adjustCreditBalance } from "./lib/ledger.js";

export const createFromBetterAuth = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    accountName: v.string()
  },
  returns: v.object({
    accountId: v.id("accounts"),
    userId: v.id("users"),
    created: v.boolean(),
    creditBalance: v.number(),
    ledgerEntryId: v.optional(v.id("creditLedger"))
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

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
        throw new ConvexError("Account missing for existing user");
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
      planId: TRIAL_PLAN_ID,
      status: "trial",
      creditBalance: 0,
      creditRefillAt: now + TRIAL_DURATION_MS,
      lowCreditThreshold: DEFAULT_LOW_CREDIT_THRESHOLD,
      createdAt: now,
      updatedAt: now
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
      delta: TRIAL_CREDIT_GRANT,
      source: "plan_grant",
      notes: "Trial signup grant",
      metadata: {
        reason: "trial_signup"
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
});
