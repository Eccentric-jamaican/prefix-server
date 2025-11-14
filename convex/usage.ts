import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { adjustCreditBalance } from "./lib/ledger.js";

type UsageMetadata = Record<string, unknown>;

type ReserveAndLogArgs = {
  accountId: Id<"accounts">;
  apiKeyId: Id<"apiKeys">;
  requestId: string;
  scanType: string;
  cost: number;
  responseStatus?: number;
  severity?: string;
  campaignTag?: string;
  metadata?: UsageMetadata;
  nowMs?: number;
};

type FinalizeArgs = {
  usageEventId: Id<"usageEvents">;
  responseStatus: number;
  severity?: string;
  metadata?: UsageMetadata;
};

export const reserveAndLog = mutation({
  args: {
    accountId: v.id("accounts"),
    apiKeyId: v.id("apiKeys"),
    requestId: v.string(),
    scanType: v.string(),
    cost: v.number(),
    responseStatus: v.optional(v.number()),
    severity: v.optional(v.string()),
    campaignTag: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    nowMs: v.optional(v.number())
  },
  returns: v.object({
    usageEventId: v.id("usageEvents"),
    ledgerEntryId: v.id("creditLedger"),
    creditBalance: v.number(),
    wasApplied: v.boolean()
  }),
  handler: async (ctx: MutationCtx, args: ReserveAndLogArgs) => {
    const now = args.nowMs ?? Date.now();
    if (args.cost <= 0) {
      throw new ConvexError({ code: "invalid_cost", cost: args.cost });
    }

    const existingUsage = await ctx.db
      .query("usageEvents")
      .withIndex("byAccountAndRequestId", (q) =>
        q.eq("accountId", args.accountId).eq("requestId", args.requestId)
      )
      .unique();

    if (existingUsage) {
      const ledger = await ctx.db
        .query("creditLedger")
        .withIndex("byAccountKeyAndRequestId", (q) =>
          q.eq("accountId", args.accountId).eq("keyId", args.apiKeyId).eq("requestId", args.requestId)
        )
        .unique();

      if (!ledger) {
        throw new ConvexError({
          code: "missing_ledger_for_request",
          requestId: args.requestId
        });
      }

      const account = await ctx.db.get(args.accountId);
      if (!account) {
        throw new ConvexError({ code: "account_not_found", accountId: args.accountId });
      }

      return {
        usageEventId: existingUsage._id,
        ledgerEntryId: ledger._id,
        creditBalance: account.creditBalance,
        wasApplied: false
      };
    }

    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new ConvexError({ code: "account_not_found", accountId: args.accountId });
    }

    if (account.status === "canceled") {
      throw new ConvexError({ code: "account_inactive", accountId: args.accountId });
    }

    const ledger = await adjustCreditBalance({
      ctx,
      accountId: args.accountId,
      apiKeyId: args.apiKeyId,
      delta: -Math.abs(args.cost),
      source: "usage",
      requestId: args.requestId,
      metadata: {
        ...(args.metadata ?? {}),
        scanType: args.scanType
      },
      now
    });

    const usageEventId = await ctx.db.insert("usageEvents", {
      accountId: args.accountId,
      keyId: args.apiKeyId,
      requestId: args.requestId,
      scanType: args.scanType,
      cost: Math.abs(args.cost),
      responseStatus: args.responseStatus,
      severity: args.severity,
      campaignTag: args.campaignTag,
      metadata: args.metadata,
      createdAt: now
    });

    return {
      usageEventId,
      ledgerEntryId: ledger.ledgerEntryId,
      creditBalance: ledger.balance,
      wasApplied: true
    };
  }
});

export const finalize = mutation({
  args: {
    usageEventId: v.id("usageEvents"),
    responseStatus: v.number(),
    severity: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any()))
  },
  returns: v.object({
    usageEventId: v.id("usageEvents"),
    responseStatus: v.number()
  }),
  handler: async (ctx: MutationCtx, args: FinalizeArgs) => {
    const usageEvent = await ctx.db.get(args.usageEventId);
    if (!usageEvent) {
      throw new ConvexError({ code: "usage_event_not_found", usageEventId: args.usageEventId });
    }

    await ctx.db.patch(args.usageEventId, {
      responseStatus: args.responseStatus,
      severity: args.severity ?? usageEvent.severity,
      metadata: args.metadata ?? usageEvent.metadata
    });

    return {
      usageEventId: args.usageEventId,
      responseStatus: args.responseStatus
    };
  }
});
