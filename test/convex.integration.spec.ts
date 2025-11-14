import request from "supertest";
import {
  beforeEach,
  afterEach,
  afterAll,
  describe,
  expect,
  it,
  vi
} from "vitest";
import type { SpyInstance } from "vitest";

import * as usageHelpers from "../src/utils/convexUsage.js";
import { InsufficientCreditsError } from "../src/utils/convexUsage.js";

const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn()
};

vi.mock("../src/services/convexClient.ts", () => ({
  __esModule: true,
  createConvexClient: vi.fn(() => mockConvexClient)
}));
const { app } = await import("../src/server.js");

const VALID_SECRET = "pfk12345-valid-secret";
const API_KEY_ID = "apiKey_1";
const ACCOUNT_ID = "account_1";

function seedSuccessfulConvexAuth() {
  mockConvexClient.query
    .mockResolvedValueOnce({
      apiKeyId: API_KEY_ID,
      accountId: ACCOUNT_ID,
      idPrefix: VALID_SECRET.slice(0, 8),
      hash: "hashed",
      revokedAt: undefined
    })
    .mockResolvedValueOnce({
      apiKeyId: API_KEY_ID,
      accountId: ACCOUNT_ID,
      hashMatches: true,
      revokedAt: undefined
    });

  mockConvexClient.mutation.mockResolvedValueOnce({
    apiKeyId: API_KEY_ID,
    lastUsedAt: Date.now()
  });
}

type ReserveArgs = Parameters<typeof usageHelpers.reserveUsage>;
type ReserveReturn = ReturnType<typeof usageHelpers.reserveUsage>;
type FinalizeArgs = Parameters<typeof usageHelpers.finalizeUsage>;
type FinalizeReturn = ReturnType<typeof usageHelpers.finalizeUsage>;

describe("Convex auth & usage integration", () => {
  let reserveSpy: SpyInstance<ReserveArgs, ReserveReturn>;
  let finalizeSpy: SpyInstance<FinalizeArgs, FinalizeReturn>;

  const originalConvexUrl = process.env.CONVEX_URL;

  beforeEach(() => {
    process.env.CONVEX_URL = "https://convex.test";
    delete process.env.API_KEY;
    mockConvexClient.query.mockReset();
    mockConvexClient.mutation.mockReset();
    reserveSpy = vi.spyOn(usageHelpers, "reserveUsage");
    finalizeSpy = vi.spyOn(usageHelpers, "finalizeUsage");
  });

  afterEach(() => {
    reserveSpy.mockRestore();
    finalizeSpy.mockRestore();
  });

  afterAll(() => {
    process.env.CONVEX_URL = originalConvexUrl;
  });

  it("allows Convex-authenticated requests and records usage", async () => {
    seedSuccessfulConvexAuth();

    reserveSpy.mockResolvedValue({
      usageEventId: "usage_1" as unknown as never,
      ledgerEntryId: "ledger_1" as unknown as never,
      creditBalance: 42,
      wasApplied: true
    });
    finalizeSpy.mockResolvedValue();

    const response = await request(app)
      .post("/v1/scan")
      .set("Authorization", `Bearer ${VALID_SECRET}`)
      .send({ subject: "Hello {First_name}" });

    expect(response.status).toBe(409);
    expect(mockConvexClient.query).toHaveBeenCalledTimes(2);
    expect(mockConvexClient.mutation).toHaveBeenCalledTimes(1);
    expect(reserveSpy).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ responseStatus: 409 })
    );
  });

  it("rejects revoked Convex API keys", async () => {
    mockConvexClient.query.mockResolvedValueOnce({
      apiKeyId: API_KEY_ID,
      accountId: ACCOUNT_ID,
      idPrefix: VALID_SECRET.slice(0, 8),
      hash: "hashed",
      revokedAt: Date.now()
    });

    const response = await request(app)
      .post("/v1/scan")
      .set("Authorization", `Bearer ${VALID_SECRET}`)
      .send({ subject: "Hello {First_name}" });

    expect(response.status).toBe(403);
    expect(reserveSpy).not.toHaveBeenCalled();
    expect(finalizeSpy).not.toHaveBeenCalled();
  });

  it("returns 402 when Convex reports insufficient credits", async () => {
    seedSuccessfulConvexAuth();

    reserveSpy.mockRejectedValue(new InsufficientCreditsError({ code: "insufficient_credits" }));

    const response = await request(app)
      .post("/v1/scan")
      .set("Authorization", `Bearer ${VALID_SECRET}`)
      .send({ subject: "Hello {First_name}" });

    expect(response.status).toBe(402);
    expect(reserveSpy).toHaveBeenCalledTimes(1);
    expect(finalizeSpy).not.toHaveBeenCalled();
  });
});
