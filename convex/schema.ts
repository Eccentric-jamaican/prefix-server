import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamp = () => v.number();
const jsonScalar = () => v.union(v.string(), v.number(), v.boolean(), v.null());

export default defineSchema({
  accounts: defineTable({
    name: v.string(),
    planId: v.string(),
    status: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
    polarCustomerId: v.optional(v.string()),
    polarProductId: v.optional(v.string()),
    polarBenefitId: v.optional(v.string()),
    ownerUserId: v.optional(v.id("users")),
    creditBalance: v.number(),
    creditRefillAt: v.optional(timestamp()),
    creditsPerCycle: v.optional(v.number()),
    planAssignedAt: v.optional(timestamp()),
    lowCreditThreshold: v.number(),
    espMetadata: v.optional(
      v.object({
        provider: v.optional(v.string()),
        // Provider-specific scalar metadata (ids/status flags/etc.). Use a record of JSON scalars to
        // avoid fully untyped blobs while keeping flexibility for future providers.
        data: v.optional(v.record(v.string(), jsonScalar()))
      })
    ),
    createdAt: timestamp(),
    updatedAt: timestamp()
  })
    .index("byStatus", ["status"])
    .index("byPolarCustomerId", ["polarCustomerId"]),
  users: defineTable({
    accountId: v.id("accounts"),
    betterAuthUserId: v.string(),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    lastLoginAt: v.optional(timestamp()),
    createdAt: timestamp()
  })
    .index("byAccount", ["accountId"])
    .index("byBetterAuthUserId", ["betterAuthUserId"]),
  apiKeys: defineTable({
    accountId: v.id("accounts"),
    idPrefix: v.string(),
    hash: v.string(),
    label: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: timestamp(),
    revokedAt: v.optional(timestamp()),
    revokedBy: v.optional(v.id("users")),
    revokedReason: v.optional(v.string()),
    lastUsedAt: v.optional(timestamp())
  })
    .index("byAccount", ["accountId"])
    .index("byIdPrefix", ["idPrefix"]),
  creditLedger: defineTable({
    accountId: v.id("accounts"),
    delta: v.number(),
    source: v.union(
      v.literal("plan_grant"),
      v.literal("top_up"),
      v.literal("usage"),
      v.literal("refund")
    ),
    requestId: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    keyId: v.optional(v.id("apiKeys")),
    createdAt: timestamp()
  })
    .index("byAccount", ["accountId"])
    .index("byRequestId", ["requestId"])
    .index("byAccountAndRequestId", ["accountId", "requestId"])
    .index("byAccountKeyAndRequestId", ["accountId", "keyId", "requestId"]),
  usageEvents: defineTable({
    accountId: v.id("accounts"),
    keyId: v.id("apiKeys"),
    requestId: v.string(),
    scanType: v.string(),
    cost: v.number(),
    responseStatus: v.optional(v.number()),
    severity: v.optional(v.string()),
    campaignTag: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: timestamp()
  })
    .index("byAccount", ["accountId", "createdAt"])
    .index("byRequestId", ["requestId"])
    .index("byAccountAndRequestId", ["accountId", "requestId"])
    .index("byAccountKeyAndRequestId", ["accountId", "keyId", "requestId"]),
  apiKeyVerificationAttempts: defineTable({
    scopeType: v.union(v.literal("account"), v.literal("ip")),
    accountId: v.optional(v.id("accounts")),
    ip: v.optional(v.string()),
    idPrefix: v.string(),
    timestamp: timestamp(),
    success: v.boolean(),
    callerUserId: v.optional(v.id("users")),
    callerAccountId: v.optional(v.id("accounts"))
  })
    .index("byAccount", ["accountId", "timestamp"])
    .index("byIp", ["ip", "timestamp"])
    .index("byIdPrefix", ["idPrefix", "timestamp"])
    .index("byCaller", ["callerAccountId", "timestamp"]),
  webhookEvents: defineTable({
    source: v.union(v.literal("polar"), v.literal("betterauth")),
    externalId: v.string(),
    payload: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("failed")
    ),
    processedAt: v.optional(timestamp()),
    error: v.optional(v.string()),
    createdAt: timestamp()
  }).index("byExternalId", ["externalId"]),
  alerts: defineTable({
    accountId: v.id("accounts"),
    type: v.union(v.literal("low_credit"), v.literal("billing"), v.literal("system")),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("dismissed")),
    payload: v.optional(v.string()),
    channels: v.optional(v.array(v.string())),
    createdAt: timestamp(),
    resolvedAt: v.optional(timestamp())
  }).index("byAccount", ["accountId", "status"])
});
