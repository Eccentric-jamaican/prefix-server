import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server.js";
import type { Id } from "../_generated/dataModel.js";

export type CreditSource = "plan_grant" | "top_up" | "usage" | "refund";

type AdjustCreditParams = {
  ctx: MutationCtx;
  accountId: Id<"accounts">;
  delta: number;
  source: CreditSource;
  requestId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  now?: number;
};

type AdjustCreditResult = {
  balance: number;
  previousBalance: number;
  timestamp: number;
  ledgerEntryId: Id<"creditLedger">;
};

export async function adjustCreditBalance({
  ctx,
  accountId,
  delta,
  source,
  requestId,
  notes,
  metadata,
  now
}: AdjustCreditParams): Promise<AdjustCreditResult> {
  const timestamp = now ?? Date.now();
  const account = await getAccount(ctx, accountId);
  const previousBalance = account.creditBalance;
  const newBalance = previousBalance + delta;

  if (newBalance < 0) {
    throw new ConvexError({
      code: "insufficient_credits",
      accountId,
      attemptedDelta: delta,
      balance: previousBalance
    });
  }

  if (delta !== 0) {
    await ctx.db.patch(accountId, {
      creditBalance: newBalance,
      updatedAt: timestamp
    });
  }

  const ledgerEntryId = await ctx.db.insert("creditLedger", {
    accountId,
    delta,
    source,
    requestId,
    notes,
    metadata,
    createdAt: timestamp
  });

  return {
    balance: newBalance,
    previousBalance,
    timestamp,
    ledgerEntryId
  };
}

async function getAccount(ctx: MutationCtx, accountId: Id<"accounts">) {
  const account = await ctx.db.get(accountId);
  if (!account) {
    throw new ConvexError({ code: "account_not_found", accountId });
  }
  return account;
}

