import type { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";

declare module "express-serve-static-core" {
  interface Locals {
    convex?: {
      client: ConvexHttpClient;
      accountId: Id<"accounts">;
      apiKeyId: Id<"apiKeys">;
      requestId?: string;
      usageEventId?: Id<"usageEvents">;
      lastCreditBalance?: number;
    };
  }
}
