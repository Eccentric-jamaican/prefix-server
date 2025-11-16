import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";
import type { PaidPlanKey } from "../../../../../shared/constants";

const requestSchema = z.object({
  accountId: z.string(),
  planKey: z.enum(["starter", "growth", "scale"]) as z.ZodType<PaidPlanKey>,
});

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

export async function POST(req: Request) {
  const convex = new ConvexHttpClient(resolveConvexUrl());

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

    const session = await convex.action(api.polar.createCheckoutSessionAction, {
      accountId,
      planKey,
      successUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancel`,
    });

    return NextResponse.json({ checkoutId: session.checkoutId, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create checkout session", details: message }, { status: 500 });
  }
}
