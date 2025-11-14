import { randomUUID } from "node:crypto";

import { ConvexError } from "convex/values";
import type { Response } from "express";

import { api } from "../../convex/_generated/api.js";
import type { FunctionReference } from "convex/server";

type UsageModule = {
  reserveAndLog: FunctionReference<"mutation">;
  finalize: FunctionReference<"mutation">;
};

const usageApi = (api as unknown as { usage: UsageModule }).usage;

export class InsufficientCreditsError extends Error {
  public readonly details?: Record<string, unknown>;

  constructor(details?: Record<string, unknown>) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
    this.details = details;
  }
}

interface ReserveUsageOptions {
  scanType: string;
  cost: number;
  metadata?: Record<string, unknown>;
}

interface FinalizeUsageOptions {
  responseStatus: number;
  severity?: string;
  metadata?: Record<string, unknown>;
}

export async function reserveUsage(
  res: Response,
  { scanType, cost, metadata }: ReserveUsageOptions
) {
  const context = res.locals.convex;
  if (!context) {
    return null;
  }

  const requestId = context.requestId ?? randomUUID();
  const normalizedCost = Number.isFinite(cost) && cost > 0 ? cost : 1;

  try {
    const reservation = await context.client.mutation(usageApi.reserveAndLog, {
      accountId: context.accountId,
      apiKeyId: context.apiKeyId,
      requestId,
      scanType,
      cost: normalizedCost,
      metadata,
      nowMs: Date.now()
    });

    res.locals.convex = {
      ...context,
      requestId,
      usageEventId: reservation.usageEventId,
      lastCreditBalance: reservation.creditBalance
    };

    return reservation;
  } catch (error) {
    if (error instanceof ConvexError && typeof error.data === "object" && error.data !== null) {
      const data = error.data as Record<string, unknown> & { code?: string };
      if (data.code === "insufficient_credits") {
        throw new InsufficientCreditsError(data);
      }
    }

    throw error;
  }
}

export async function finalizeUsage(res: Response, { responseStatus, severity, metadata }: FinalizeUsageOptions) {
  const context = res.locals.convex;
  if (!context?.usageEventId) {
    return;
  }

  try {
    await context.client.mutation(usageApi.finalize, {
      usageEventId: context.usageEventId,
      responseStatus,
      severity,
      metadata
    });
  } catch (error) {
    // Finalization failures should not block the response path but should be visible.
    console.error("Failed to finalize usage event", error);
  }
}
