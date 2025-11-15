import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

const convexSiteUrl =
  process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error(
    "Set CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL to proxy BetterAuth requests."
  );
}

export const { GET, POST } = nextJsHandler({ convexSiteUrl });