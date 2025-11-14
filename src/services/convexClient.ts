import { ConvexHttpClient } from "convex/browser";

export interface ConvexClientConfig {
  authToken?: string;
}

export function createConvexClient(config: ConvexClientConfig = {}): ConvexHttpClient {
  const convexUrl = process.env.CONVEX_DEPLOYMENT_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing Convex deployment URL. Set CONVEX_DEPLOYMENT_URL.");
  }

  return new ConvexHttpClient(convexUrl, {
    auth: config.authToken ?? process.env.CONVEX_ADMIN_TOKEN ?? process.env.CONVEX_ADMIN_AUTH_TOKEN
  });
}

