import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import type { Doc, Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { adjustCreditBalance, type CreditSource } from "./lib/ledger.js";
import { authComponent } from "./auth.js";

const creditSourceValidator = v.union(
  v.literal("plan_grant"),
  v.literal("top_up"),
  v.literal("usage"),
  v.literal("refund")
);

type CreditLedgerDoc = Doc<"creditLedger">;

async function findLedgerEntryByRequestId(
  ctx: MutationCtx,
  requestId: string
): Promise<CreditLedgerDoc | null> {
  return ctx.db
    .query("creditLedger")
    .withIndex("byRequestId", (q) => q.eq("requestId", requestId))
    .unique();
}

export const applyDelta = mutation({
  args: {
    accountId: v.id("accounts"),
    delta: v.number(),
    source: creditSourceValidator,
    requestId: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    nowMs: v.optional(v.number())
  },
  returns: v.object({
    accountId: v.id("accounts"),
    ledgerEntryId: v.id("creditLedger"),
    creditBalance: v.number(),
    wasApplied: v.boolean()
  }),
  handler: async (ctx: MutationCtx, args) => {
    const now = args.nowMs ?? Date.now();

    if (args.requestId) {
      const existing = await findLedgerEntryByRequestId(ctx, args.requestId);
      if (existing) {
        const account = await ctx.db.get(existing.accountId);
        if (!account) {
          throw new ConvexError({ code: "missing_account", requestId: args.requestId });
        }

        return {
          accountId: existing.accountId,
          ledgerEntryId: existing._id,
          creditBalance: account.creditBalance,
          wasApplied: false
        };
      }
    }

    const result = await adjustCreditBalance({
      ctx,
      accountId: args.accountId,
      delta: args.delta,
      source: args.source as CreditSource,
      requestId: args.requestId,
      notes: args.notes,
      metadata: args.metadata ?? undefined,
      now
    });

    return {
      accountId: args.accountId,
      ledgerEntryId: result.ledgerEntryId,
      creditBalance: result.balance,
      wasApplied: true
    };
  }
});

export const getHistoryForCurrentUser = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("creditLedger"),
      _creationTime: v.number(),
      accountId: v.id("accounts"),
      delta: v.number(),
      source: creditSourceValidator,
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx: QueryCtx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const betterAuthUserId = authUser._id;
    const user = await ctx.db
      .query("users")
      .withIndex("byBetterAuthUserId", (q) => q.eq("betterAuthUserId", betterAuthUserId))
      .unique();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 30;
    const entries = await ctx.db
      .query("creditLedger")
      .withIndex("byAccount", (q) => q.eq("accountId", user.accountId))
      .order("desc")
      .take(limit);

    return entries.map((entry) => ({
      _id: entry._id,
      _creationTime: entry._creationTime,
      accountId: entry.accountId,
      delta: entry.delta,
      source: entry.source,
      notes: entry.notes,
      createdAt: entry.createdAt,
    }));
  },
});
