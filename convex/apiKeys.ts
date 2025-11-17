import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { generateApiKey, hashApiKey, type GeneratedApiKey } from "./lib/apiKeys.js";
import { authComponent } from "./auth.js";

const apiKeyResponseValidator = v.object({
  apiKeyId: v.id("apiKeys"),
  accountId: v.id("accounts"),
  idPrefix: v.string(),
  hash: v.string(),
  revokedAt: v.optional(v.number())
});

const apiKeyIssueReturnValidator = v.object({
  apiKeyId: v.id("apiKeys"),
  secret: v.string(),
  prefix: v.string()
});

export const issue = mutation({
  args: {
    accountId: v.id("accounts"),
    createdByUserId: v.id("users"),
    label: v.optional(v.string())
  },
  returns: apiKeyIssueReturnValidator,
  handler: async (ctx, args) => {
    return performIssue(ctx, args.accountId, args.createdByUserId, args.label ?? undefined);
  }
});

export const issueForCurrentUser = mutation({
  args: {
    label: v.optional(v.string())
  },
  returns: apiKeyIssueReturnValidator,
  handler: async (ctx, args) => {
    const { betterAuthUserId } = await requireAuthenticatedUser(ctx);
    const user = await getOrCreateUserByBetterAuthId(ctx, betterAuthUserId);

    return performIssue(ctx, user.accountId, user._id, args.label ?? undefined);
  }
});

const apiKeyRevokeReturnValidator = v.object({
  apiKeyId: v.id("apiKeys"),
  revokedAt: v.number(),
  alreadyRevoked: v.boolean()
});

export const revoke = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    revokedByUserId: v.optional(v.id("users")),
    reason: v.optional(v.string())
  },
  returns: apiKeyRevokeReturnValidator,
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new ConvexError({ code: "api_key_not_found", apiKeyId: args.apiKeyId });
    }

    if (apiKey.revokedAt) {
      return {
        apiKeyId: apiKey._id,
        revokedAt: apiKey.revokedAt,
        alreadyRevoked: true
      };
    }

    const now = Date.now();

    await ctx.db.patch(args.apiKeyId, {
      revokedAt: now,
      revokedReason: args.reason ?? undefined,
      revokedBy: args.revokedByUserId ?? undefined
    });

    return {
      apiKeyId: args.apiKeyId,
      revokedAt: now,
      alreadyRevoked: false
    };
  }
});

export const revokeForCurrentUser = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    reason: v.optional(v.string())
  },
  returns: apiKeyRevokeReturnValidator,
  handler: async (ctx, args) => {
    const { betterAuthUserId } = await requireAuthenticatedUser(ctx);
    const user = await getOrCreateUserByBetterAuthId(ctx, betterAuthUserId);

    const key = await ctx.db.get(args.apiKeyId);
    if (!key) {
      throw new ConvexError({ code: "api_key_not_found", apiKeyId: args.apiKeyId });
    }

    if (key.accountId !== user.accountId) {
      throw new ConvexError({ code: "api_key_wrong_account", apiKeyId: args.apiKeyId });
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
      revokedReason: args.reason ?? undefined,
      revokedBy: user._id
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

const apiKeyListEntryValidator = v.object({
  apiKeyId: v.id("apiKeys"),
  label: v.optional(v.string()),
  idPrefix: v.string(),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number())
});

export const listForCurrentUser = query({
  args: {},
  returns: v.array(apiKeyListEntryValidator),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);

    if (!authUser) {
      console.warn("Unauthenticated listForCurrentUser call; returning empty list");
      return [];
    }

    const betterAuthUserId =
      typeof authUser.userId === "string" && authUser.userId.length > 0
        ? authUser.userId
        : authUser._id;

    if (typeof authUser.userId !== "string" || authUser.userId.length === 0) {
      console.warn("BetterAuth user missing userId; using internal id", {
        authUserId: authUser._id,
      });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("byBetterAuthUserId", (q) => q.eq("betterAuthUserId", betterAuthUserId))
      .unique();

    if (!user) {
      console.warn(
        "BetterAuth user is missing Convex user record; returning empty API key list",
        { betterAuthUserId },
      );
      return [];
    }

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("byAccount", (q) => q.eq("accountId", user.accountId))
      .collect();

    keys.sort((a, b) => b.createdAt - a.createdAt);

    return keys.map((key) => ({
      apiKeyId: key._id,
      label: key.label ?? undefined,
      idPrefix: key.idPrefix,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt ?? undefined,
      revokedAt: key.revokedAt ?? undefined
    }));
  }
});

async function generateUniqueApiKey(ctx: MutationCtx): Promise<GeneratedApiKey> {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const generated = await generateApiKey();
    const collision = await ctx.db
      .query("apiKeys")
      .withIndex("byIdPrefix", (q) => q.eq("idPrefix", generated.prefix))
      .unique();

    if (!collision) {
      return generated;
    }
  }

  console.error("Failed to generate unique API key after retries");
  throw new ConvexError({ code: "api_key_generation_failed", attempts: maxAttempts });
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

type AnyCtx = MutationCtx | QueryCtx;

type AuthUserDoc = Awaited<ReturnType<typeof authComponent.getAuthUser>>;

async function requireAuthenticatedUser(ctx: AnyCtx): Promise<{
  authUser: NonNullable<AuthUserDoc>;
  betterAuthUserId: string;
}> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new ConvexError({ code: "not_authenticated" });
  }

  const betterAuthUserId =
    typeof authUser.userId === "string" && authUser.userId.length > 0
      ? authUser.userId
      : authUser._id;

  if (typeof authUser.userId !== "string" || authUser.userId.length === 0) {
    console.warn("BetterAuth user missing userId field; falling back to _id", {
      authUserId: authUser._id,
    });
  }

  return { authUser, betterAuthUserId };
}

async function getUserByBetterAuthId(ctx: AnyCtx, betterAuthUserId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("byBetterAuthUserId", (q) => q.eq("betterAuthUserId", betterAuthUserId))
    .unique();

  if (!user) {
    throw new ConvexError({ code: "user_not_found", betterAuthUserId });
  }

  return user;
}

import type { Doc } from "./_generated/dataModel.js";

async function getOrCreateUserByBetterAuthId(ctx: MutationCtx, betterAuthUserId: string): Promise<Doc<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("byBetterAuthUserId", (q) => q.eq("betterAuthUserId", betterAuthUserId))
    .unique();

  if (existing) {
    return existing;
  }

  const authUserDoc = await authComponent.getAuthUser(ctx);
  if (!authUserDoc) {
    throw new ConvexError({ code: "not_authenticated" });
  }

  const email = typeof authUserDoc.email === "string" ? authUserDoc.email : undefined;
  const name = typeof authUserDoc.name === "string" ? authUserDoc.name : "Prefix User";

  const account = await createAccountForRecoveredUser(ctx, {
    betterAuthUserId,
    email,
    name,
  });

  if (!account.user) {
    throw new ConvexError({ code: "user_creation_failed", betterAuthUserId });
  }

  return account.user;
}

async function createAccountForRecoveredUser(
  ctx: MutationCtx,
  {
    betterAuthUserId,
    email,
    name,
  }: {
    betterAuthUserId: string;
    email?: string;
    name: string;
  },
) {
  const now = Date.now();

  const accountId = await ctx.db.insert("accounts", {
    name,
    planId: "trial",
    status: "trial",
    creditBalance: 0,
    lowCreditThreshold: 200,
    createdAt: now,
    updatedAt: now,
    creditRefillAt: now,
  });

  const userId = await ctx.db.insert("users", {
    accountId,
    betterAuthUserId,
    email: email ?? `${betterAuthUserId}@placeholder.prefix.local`,
    role: "owner",
    createdAt: now,
  });

  await ctx.db.patch(accountId, { ownerUserId: userId });

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new ConvexError({ code: "user_creation_failed", betterAuthUserId });
  }

  return {
    accountId,
    user,
  };
}

async function performIssue(
  ctx: MutationCtx,
  accountId: Id<"accounts">,
  createdByUserId: Id<"users">,
  label?: string,
) {
  const account = await ctx.db.get(accountId);
  if (!account) {
    throw new ConvexError({ code: "account_not_found", accountId });
  }

  const user = await ctx.db.get(createdByUserId);
  if (!user || user.accountId !== accountId) {
    throw new ConvexError({
      code: "user_not_in_account",
      accountId,
      userId: createdByUserId
    });
  }

  const now = Date.now();
  const generated = await generateUniqueApiKey(ctx);

  const apiKeyId = await ctx.db.insert("apiKeys", {
    accountId,
    idPrefix: generated.prefix,
    hash: generated.hash,
    label,
    createdBy: createdByUserId,
    createdAt: now
  });

  return {
    apiKeyId,
    secret: generated.secret,
    prefix: generated.prefix
  };
}
