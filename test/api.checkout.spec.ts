import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  createPostHandler as createPostHandlerImpl,
  type CheckoutSessionHandlerOverrides,
} from "../prefix-web/app/api/checkout/session/route.js";

type Overrides = CheckoutSessionHandlerOverrides;
type GetTokenFn = NonNullable<Overrides["getTokenFn"]>;
type CreateConvexClientFn = NonNullable<Overrides["createConvexClient"]>;

let createPostHandler: typeof createPostHandlerImpl;

const getTokenMock = vi.fn<GetTokenFn>();
const setAuthMock = vi.fn();
const queryMock = vi.fn();
const actionMock = vi.fn();

const originalSiteUrl = process.env.SITE_URL;
const originalConvexSiteUrl = process.env.CONVEX_SITE_URL;
const originalBetterAuthSecret = process.env.BETTER_AUTH_SECRET;
const originalConvexDeploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
const originalConvexUrl = process.env.CONVEX_URL;
const originalPublicConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const originalAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

beforeAll(async () => {
  process.env.SITE_URL = "https://app.example.com";
  process.env.CONVEX_SITE_URL = "https://convex-site.example.com";
  process.env.BETTER_AUTH_SECRET = "secret";
  process.env.CONVEX_DEPLOYMENT_URL = "https://convex.dev.deployment";
  delete process.env.CONVEX_URL;
  delete process.env.NEXT_PUBLIC_CONVEX_URL;
  delete process.env.NEXT_PUBLIC_APP_ORIGIN;

  ({ createPostHandler } = await import("../prefix-web/app/api/checkout/session/route.js"));
});

afterAll(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.SITE_URL;
  } else {
    process.env.SITE_URL = originalSiteUrl;
  }

  if (originalConvexSiteUrl === undefined) {
    delete process.env.CONVEX_SITE_URL;
  } else {
    process.env.CONVEX_SITE_URL = originalConvexSiteUrl;
  }

  if (originalBetterAuthSecret === undefined) {
    delete process.env.BETTER_AUTH_SECRET;
  } else {
    process.env.BETTER_AUTH_SECRET = originalBetterAuthSecret;
  }

  if (originalConvexDeploymentUrl === undefined) {
    delete process.env.CONVEX_DEPLOYMENT_URL;
  } else {
    process.env.CONVEX_DEPLOYMENT_URL = originalConvexDeploymentUrl;
  }

  if (originalConvexUrl === undefined) {
    delete process.env.CONVEX_URL;
  } else {
    process.env.CONVEX_URL = originalConvexUrl;
  }

  if (originalPublicConvexUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
  } else {
    process.env.NEXT_PUBLIC_CONVEX_URL = originalPublicConvexUrl;
  }

  if (originalAppOrigin === undefined) {
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
  } else {
    process.env.NEXT_PUBLIC_APP_ORIGIN = originalAppOrigin;
  }
});

const makeRequest = (body: unknown) =>
  new Request("https://app.example.com/api/checkout/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const createHandler = () =>
  createPostHandler({
    getTokenFn: getTokenMock as GetTokenFn,
    createConvexClient: (() => ({
      setAuth: setAuthMock,
      query: queryMock,
      action: actionMock,
    })) as CreateConvexClientFn,
  });

describe("/api/checkout/session", () => {
  beforeEach(() => {
    getTokenMock.mockReset();
    setAuthMock.mockReset();
    queryMock.mockReset();
    actionMock.mockReset();
  });

  it("returns checkout session details when authenticated owner requests", async () => {
    const handler = createHandler();
    getTokenMock.mockResolvedValue("jwt-token");
    queryMock.mockResolvedValueOnce({
      accountId: "accounts_1",
      userId: "users_1",
      role: "owner",
    });
    actionMock.mockResolvedValueOnce({
      checkoutId: "checkout_123",
      url: "https://polar.host/checkout/checkout_123",
    });

    const response = await handler(
      makeRequest({ accountId: "accounts_1", planKey: "starter" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutId: "checkout_123",
      url: "https://polar.host/checkout/checkout_123",
    });

    expect(setAuthMock).toHaveBeenCalledWith("jwt-token");
    expect(queryMock).toHaveBeenCalledWith(expect.anything(), {});
    expect(actionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accountId: "accounts_1",
        planKey: "starter",
        successUrl: "https://app.example.com/checkout/success",
        cancelUrl: "https://app.example.com/checkout/cancel",
      }),
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    const handler = createHandler();
    getTokenMock.mockResolvedValue(null);

    const response = await handler(
      makeRequest({ accountId: "accounts_1", planKey: "starter" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(queryMock).not.toHaveBeenCalled();
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 401 when membership lookup fails", async () => {
    const handler = createHandler();
    getTokenMock.mockResolvedValue("jwt-token");
    queryMock.mockResolvedValueOnce(null);

    const response = await handler(
      makeRequest({ accountId: "accounts_1", planKey: "starter" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 403 when membership role is not owner", async () => {
    const handler = createHandler();
    getTokenMock.mockResolvedValue("jwt-token");
    queryMock.mockResolvedValueOnce({
      accountId: "accounts_1",
      userId: "users_1",
      role: "member",
    });

    const response = await handler(
      makeRequest({ accountId: "accounts_1", planKey: "starter" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Insufficient permissions" });
    expect(actionMock).not.toHaveBeenCalled();
  });

  it("returns 403 when requested account does not match membership", async () => {
    const handler = createHandler();
    getTokenMock.mockResolvedValue("jwt-token");
    queryMock.mockResolvedValueOnce({
      accountId: "accounts_other",
      userId: "users_1",
      role: "owner",
    });

    const response = await handler(
      makeRequest({ accountId: "accounts_1", planKey: "starter" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Account mismatch" });
    expect(actionMock).not.toHaveBeenCalled();
  });
});
