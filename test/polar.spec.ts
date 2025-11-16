import { describe, expect, it, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";

import { ConvexError } from "convex/values";

import {
  handleCreateCheckoutSession,
  type CreateCheckoutSessionArgs,
} from "../convex/polar.js";
import { POLAR_PLAN_DEFINITIONS } from "../convex/lib/constants.js";
import type { ActionCtx } from "../convex/_generated/server.js";
import type { Id } from "../convex/_generated/dataModel.js";

vi.mock("../convex/lib/polar.js", () => ({
  createCheckoutSession: vi.fn(),
}));

const { createCheckoutSession } = await import("../convex/lib/polar.js");
const mockedCreateCheckoutSession = createCheckoutSession as unknown as Mock;

describe("handleCreateCheckoutSession", () => {
  let ctx: ActionCtx;
  let runQueryMock: Mock;

  const baseArgs: CreateCheckoutSessionArgs = {
    accountId: "accounts_1" as Id<"accounts">,
    planKey: "starter",
    successUrl: "https://prefix.local/success",
    cancelUrl: "https://prefix.local/cancel",
  };

  beforeEach(() => {
    runQueryMock = vi.fn();
    ctx = {
      runQuery: runQueryMock as unknown as ActionCtx["runQuery"],
    } as unknown as ActionCtx;

    mockedCreateCheckoutSession.mockReset();
    mockedCreateCheckoutSession.mockResolvedValue({
      id: "checkout_123",
      url: "https://polar.host/checkout/checkout_123",
    });
  });

  it("returns checkout session details when authenticated owner creates session", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        accountId: baseArgs.accountId,
        userId: "users_1",
        role: "owner",
      })
      .mockResolvedValueOnce({
        accountId: baseArgs.accountId,
        planId: POLAR_PLAN_DEFINITIONS.starter.planId,
        polarCustomerId: "customer_1",
      });

    const result = await handleCreateCheckoutSession(ctx, baseArgs);

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: POLAR_PLAN_DEFINITIONS.starter.productId,
        customerId: "customer_1",
      }),
    );
    expect(result).toEqual({
      checkoutId: "checkout_123",
      url: "https://polar.host/checkout/checkout_123",
    });
  });

  it("throws when plan key is unknown", async () => {
    await expect(
      handleCreateCheckoutSession(ctx, {
        ...baseArgs,
        planKey: "invalid" as CreateCheckoutSessionArgs["planKey"],
      }),
    ).rejects.toBeInstanceOf(ConvexError);
    expect(runQueryMock).not.toHaveBeenCalled();
  });

  it("throws when membership lookup fails", async () => {
    runQueryMock.mockResolvedValueOnce(null);

    await expect(handleCreateCheckoutSession(ctx, baseArgs)).rejects.toMatchObject({
      data: expect.objectContaining({ code: "not_authenticated" }),
    });

    expect(runQueryMock).toHaveBeenCalledTimes(1);
  });

  it("throws when membership role is not owner", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        accountId: baseArgs.accountId,
        userId: "users_1",
        role: "member",
      });

    await expect(handleCreateCheckoutSession(ctx, baseArgs)).rejects.toMatchObject({
      data: expect.objectContaining({ code: "insufficient_permissions" }),
    });
  });

  it("throws when membership account does not match requested account", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        accountId: "accounts_other",
        userId: "users_1",
        role: "owner",
      });

    await expect(handleCreateCheckoutSession(ctx, baseArgs)).rejects.toMatchObject({
      data: expect.objectContaining({ code: "account_mismatch" }),
    });
  });

  it("throws when account cannot be found", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        accountId: baseArgs.accountId,
        userId: "users_1",
        role: "owner",
      })
      .mockResolvedValueOnce(null);

    await expect(handleCreateCheckoutSession(ctx, baseArgs)).rejects.toMatchObject({
      data: expect.objectContaining({ code: "account_not_found" }),
    });
  });
});
