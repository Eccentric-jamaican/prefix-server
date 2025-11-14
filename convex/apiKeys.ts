import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx } from "./_generated/server.js";
import { generateApiKey, hashApiKey, type GeneratedApiKey } from "./lib/apiKeys.js";

const apiKeyResponseValidator = v.object({
  apiKeyId: v.id("apiKeys"),
  accountId: v.id("accounts"),
  idPrefix: v.string(),
  hash: v.string(),
  revokedAt: v.optional(v.number())
});

export const issue = mutation({
  args: {
    accountId: v.id("accounts"),
    createdByUserId: v.id("users"),
    label: v.optional(v.string())
  },
  returns: v.object({
    apiKeyId: v.id("apiKeys"),
    secret: v.string(),
    prefix: v.string()
  }),
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      throw new ConvexError({ code: "account_not_found", accountId: args.accountId });
    }

    const user = await ctx.db.get(args.createdByUserId);
    if (!user || user.accountId !== args.accountId) {
      throw new ConvexError({
        code: "user_not_in_account",
        accountId: args.accountId,
        userId: args.createdByUserId
      });
    }

    const now = Date.now();
    const generated = await generateUniqueApiKey(ctx);

    const apiKeyId = await ctx.db.insert("apiKeys", {
      accountId: args.accountId,
      idPrefix: generated.prefix,
      hash: generated.hash,
      label: args.label,
      createdBy: args.createdByUserId,
      createdAt: now
    });

    return {
      apiKeyId,
      secret: generated.secret,
      prefix: generated.prefix
    };
  }
});

export const revoke = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    revokedByUserId: v.optional(v.id("users")),
    reason: v.optional(v.string())
  },
  returns: v.object({
    apiKeyId: v.id("apiKeys"),
    revokedAt: v.optional(v.number()),
    alreadyRevoked: v.boolean()
  }),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.apiKeyId);
    if (!key) {
      throw new ConvexError({ code: "api_key_not_found", apiKeyId: args.apiKeyId });
    }

    if (key.revokedAt) {
      return {
        apiKeyId: key._id,
        revokedAt: key.revokedAt,
        alreadyRevoked: true
      };
    }

    const now = Date.now();

    await ctx.db.patch(args.apiKeyId, {
      revokedAt: now,
      revokedReason: args.reason ?? undefined
    });

    return {
      apiKeyId: args.apiKeyId,
      revokedAt: now,
      alreadyRevoked: false
    };
  }
});

export const markUsed = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    nowMs: v.optional(v.number())
  },
  returns: v.object({
    apiKeyId: v.id("apiKeys"),
    lastUsedAt: v.number()
  }),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.apiKeyId);
    if (!key) {
      throw new ConvexError({ code: "api_key_not_found", apiKeyId: args.apiKeyId });
    }

    if (key.revokedAt) {
      throw new ConvexError({ code: "api_key_revoked", apiKeyId: args.apiKeyId });
    }

    const lastUsedAt = args.nowMs ?? Date.now();
    await ctx.db.patch(args.apiKeyId, { lastUsedAt });

    return {
      apiKeyId: args.apiKeyId,
      lastUsedAt
    };
  }
});

export const lookupByPrefix = query({
  args: {
    idPrefix: v.string()
  },
  returns: v.union(apiKeyResponseValidator, v.null()),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("byIdPrefix", (q) => q.eq("idPrefix", args.idPrefix))
      .unique();

    if (!key) {
      return null;
    }

    return {
      apiKeyId: key._id,
      accountId: key.accountId,
      idPrefix: key.idPrefix,
      hash: key.hash,
      revokedAt: key.revokedAt ?? undefined
    };
  }
});

async function generateUniqueApiKey(ctx: MutationCtx): Promise<GeneratedApiKey> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generated = await generateApiKey();
    const collision = await ctx.db
      .query("apiKeys")
      .withIndex("byIdPrefix", (q) => q.eq("idPrefix", generated.prefix))
      .unique();

    if (!collision) {
      return generated;
    }
  }

  throw new ConvexError({ code: "api_key_generation_failed" });
}

export const verifySecret = query({
  args: {
    idPrefix: v.string(),
    secret: v.string()
  },
  returns: v.union(
    v.object({
      apiKeyId: v.id("apiKeys"),
      accountId: v.id("accounts"),
      hashMatches: v.boolean(),
      revokedAt: v.optional(v.number())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("byIdPrefix", (q) => q.eq("idPrefix", args.idPrefix))
      .unique();

    if (!key) {
      return null;
    }

    const hashMatches = key.hash === (await hashApiKey(args.secret));

    return {
      apiKeyId: key._id,
      accountId: key.accountId,
      hashMatches,
      revokedAt: key.revokedAt ?? undefined
    };
  }
});
