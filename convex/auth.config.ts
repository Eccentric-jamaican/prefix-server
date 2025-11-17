const convexSiteUrl = process.env.CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error(
    "CONVEX_SITE_URL is required but missing. Please set it to the Convex deployment domain before starting the app.",
  );
}

export default {
  providers: [
    {
      domain: convexSiteUrl,
      applicationID: "convex",
    },
  ],
};
