import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { getToken } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "../../../../convex/auth";
import { api } from "../../../../convex/_generated/api";
import type { PaidPlanKey } from "../../../../../shared/constants";

const requestSchema = z.object({
  accountId: z.string(),
  planKey: z.enum(["starter", "growth", "scale"]) as z.ZodType<PaidPlanKey>,
});

type ConvexClient = Pick<InstanceType<typeof ConvexHttpClient>, "setAuth" | "query" | "action">;

type HandlerDependencies = {
  getTokenFn: typeof getToken;
  createConvexClient: () => ConvexClient;
};

function resolveConvexUrl() {
  const url = process.env.CONVEX_DEPLOYMENT_URL ?? process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Missing Convex deployment URL. Set CONVEX_DEPLOYMENT_URL or NEXT_PUBLIC_CONVEX_URL.");
  }
  return url;
}

function resolveAppOrigin(req: Request) {
  return process.env.NEXT_PUBLIC_APP_ORIGIN ?? new URL(req.url).origin;
}

const defaultDependencies: HandlerDependencies = {
  getTokenFn: getToken,
  createConvexClient: () => new ConvexHttpClient(resolveConvexUrl()),
};

export type CheckoutSessionHandlerOverrides = Partial<HandlerDependencies>;

export function createPostHandler(overrides: CheckoutSessionHandlerOverrides = {}) {
  const dependencies: HandlerDependencies = {
    ...defaultDependencies,
    ...overrides,
  };

  return async function POST(req: Request) {
    const convex = dependencies.createConvexClient();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const { accountId, planKey } = parsed.data;

    try {
      const origin = resolveAppOrigin(req);

      const token = await dependencies.getTokenFn(createAuth);
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      convex.setAuth(token);

      const membership = await convex.query(api.accounts.getAccountForCurrentUser, {});
      if (!membership) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (membership.role !== "owner") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      if (membership.accountId !== accountId) {
        return NextResponse.json({ error: "Account mismatch" }, { status: 403 });
      }

      const checkoutSession = await convex.action(api.polar.createCheckoutSessionAction, {
        accountId: membership.accountId,
        planKey,
        successUrl: `${origin}/checkout/success`,
        cancelUrl: `${origin}/checkout/cancel`,
      });

      return NextResponse.json({ checkoutId: checkoutSession.checkoutId, url: checkoutSession.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: "Failed to create checkout session", details: message }, { status: 500 });
    }
  };
}

export const POST = createPostHandler();
