import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { MockInstance } from "vitest";

import {
  handleCreateFromBetterAuth,
  handleAssignPlan
} from "../convex/accounts.js";
import type { Id } from "../convex/_generated/dataModel.js";
import {
  POLAR_PLAN_DEFINITIONS,
  TRIAL_CREDIT_GRANT,
  TRIAL_DURATION_MS,
  TRIAL_PLAN_ID
} from "../shared/constants.js";
import * as ledgerModule from "../convex/lib/ledger.js";

type MutationContext = Parameters<typeof handleCreateFromBetterAuth>[0];

type StoredDocument = Record<string, unknown> & { _id: string };

type TableShape = Record<string, StoredDocument[]>;

class MockDb {
  private tables = new Map<string, Map<string, StoredDocument>>();
  private counters = new Map<string, number>();

  constructor(initialData: TableShape = {}) {
    for (const [table, docs] of Object.entries(initialData)) {
      const map = new Map<string, StoredDocument>();
      let maxCounter = 0;
      for (const doc of docs) {
        map.set(doc._id, { ...doc });
        const suffix = Number(doc._id.split("_").at(-1));
        if (!Number.isNaN(suffix)) {
          maxCounter = Math.max(maxCounter, suffix);
        }
      }
      this.tables.set(table, map);
      this.counters.set(table, maxCounter);
    }
  }

  insert(table: string, doc: Record<string, unknown>) {
    this.ensureTable(table);
    const counter = (this.counters.get(table) ?? 0) + 1;
    this.counters.set(table, counter);
    const id = `${table}_${counter}`;
    const stored: StoredDocument = { _id: id, ...doc };
    this.tables.get(table)!.set(id, stored);
    return id;
  }

  get(id: string) {
    const table = this.tableFromId(id);
    const record = this.tables.get(table)?.get(id);
    return record ? { ...record } : null;
  }

  patch(id: string, updates: Record<string, unknown>) {
    const table = this.tableFromId(id);
    const record = this.tables.get(table)?.get(id);
    if (!record) {
      throw new Error(`Record ${id} not found`);
    }
    Object.assign(record, updates);
  }

  query(table: string) {
    this.ensureTable(table);
    const map = this.tables.get(table)!;
    return {
      withIndex: (
        _indexName: string,
        callback: (builder: { eq(field: string, value: unknown): unknown }) => unknown
      ) => {
        const filters: { field: string; value: unknown }[] = [];
        const builder = {
          eq: (field: string, value: unknown) => {
            filters.push({ field, value });
            return builder;
          }
        };
        callback(builder);
        return {
          unique: async () => {
            const docs = Array.from(map.values());
            const match = docs.find((doc) =>
              filters.every((filter) => doc[filter.field] === filter.value)
            );
            return match ? { ...match } : null;
          }
        };
      }
    };
  }

  snapshot(table: string) {
    this.ensureTable(table);
    return Array.from(this.tables.get(table)!.values()).map((doc) => ({ ...doc }));
  }

  peek(table: string, id: string) {
    const record = this.tables.get(table)?.get(id);
    return record ? { ...record } : null;
  }

  private ensureTable(table: string) {
    if (!this.tables.has(table)) {
      this.tables.set(table, new Map());
      this.counters.set(table, 0);
    }
  }

  private tableFromId(id: string) {
    const separator = id.indexOf("_");
    if (separator === -1) {
      throw new Error(`Invalid id format: ${id}`);
    }
    return id.slice(0, separator);
  }
}

const FIXED_NOW = new Date("2024-01-01T00:00:00.000Z").getTime();

describe("convex/accounts createFromBetterAuth", () => {
  let dateNowSpy: MockInstance<[], number>;

  beforeEach(() => {
    vi.restoreAllMocks();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it("persists paid plan metadata when a planKey is provided", async () => {
    const db = new MockDb();
    const ctx = { db } as unknown as MutationContext;
    const plan = POLAR_PLAN_DEFINITIONS.growth;

    const ledgerSpy = vi
      .spyOn(ledgerModule, "adjustCreditBalance")
      .mockResolvedValue({
        balance: plan.creditsPerCycle,
        previousBalance: 0,
        timestamp: FIXED_NOW,
        ledgerEntryId: "creditLedger_1" as never
      });

    const result = await handleCreateFromBetterAuth(ctx, {
      betterAuthUserId: "user_1",
      email: "owner@example.com",
      accountName: "Owner Org",
      planKey: "growth"
    });

    expect(result).toMatchObject({
      created: true,
      creditBalance: plan.creditsPerCycle
    });

    expect(ledgerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: plan.creditsPerCycle,
        metadata: expect.objectContaining({ planKey: "growth", planId: plan.planId })
      })
    );

    const account = db.peek("accounts", result.accountId as string);
    expect(account).toMatchObject({
      planId: plan.planId,
      status: "active",
      polarProductId: plan.productId,
      polarBenefitId: plan.benefitId,
      creditsPerCycle: plan.creditsPerCycle,
      planAssignedAt: FIXED_NOW
    });

    const users = db.snapshot("users");
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      accountId: result.accountId,
      betterAuthUserId: "user_1",
      email: "owner@example.com",
      role: "owner"
    });
  });

  it("falls back to the trial plan when no planKey is supplied", async () => {
    const db = new MockDb();
    const ctx = { db } as unknown as MutationContext;

    const ledgerSpy = vi
      .spyOn(ledgerModule, "adjustCreditBalance")
      .mockResolvedValue({
        balance: TRIAL_CREDIT_GRANT,
        previousBalance: 0,
        timestamp: FIXED_NOW,
        ledgerEntryId: "creditLedger_1" as never
      });

    const result = await handleCreateFromBetterAuth(ctx, {
      betterAuthUserId: "user_2",
      email: "trial@example.com",
      accountName: "Trial Org"
    });

    expect(result.created).toBe(true);
    expect(ledgerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: TRIAL_CREDIT_GRANT,
        metadata: expect.objectContaining({ reason: "trial_signup" })
      })
    );

    const account = db.peek("accounts", result.accountId as string);
    expect(account).toMatchObject({
      planId: TRIAL_PLAN_ID,
      status: "trial",
      creditRefillAt: FIXED_NOW + TRIAL_DURATION_MS
    });
  });
});

describe("convex/accounts assignPlan", () => {
  let dateNowSpy: MockInstance<[], number>;

  beforeEach(() => {
    vi.restoreAllMocks();
    dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it("updates account metadata and grants credits for the selected plan", async () => {
    const accountId = "accounts_1" as Id<"accounts">;
    const db = new MockDb({
      accounts: [
        {
          _id: accountId,
          name: "Existing",
          planId: TRIAL_PLAN_ID,
          status: "trial",
          creditBalance: 0,
          lowCreditThreshold: 200,
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW
        }
      ]
    });
    const ctx = { db } as unknown as MutationContext;
    const plan = POLAR_PLAN_DEFINITIONS.scale;

    const ledgerEntryId = "creditLedger_42" as Id<"creditLedger">;
    const ledgerSpy = vi
      .spyOn(ledgerModule, "adjustCreditBalance")
      .mockResolvedValue({
        balance: plan.creditsPerCycle,
        previousBalance: 0,
        timestamp: FIXED_NOW,
        ledgerEntryId
      });

    const polarCustomerId = "polarCustomer_123";

    const result = await handleAssignPlan(ctx, {
      accountId,
      planKey: "scale",
      polarCustomerId,
      nowMs: FIXED_NOW
    });

    expect(result).toMatchObject({
      accountId,
      planId: plan.planId,
      status: "active",
      creditBalance: plan.creditsPerCycle,
      ledgerEntryId
    });

    expect(ledgerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        delta: plan.creditsPerCycle,
        metadata: expect.objectContaining({ planKey: "scale", planId: plan.planId })
      })
    );

    const updatedAccount = db.peek("accounts", accountId);
    expect(updatedAccount).toMatchObject({
      planId: plan.planId,
      status: "active",
      polarProductId: plan.productId,
      polarBenefitId: plan.benefitId,
      creditsPerCycle: plan.creditsPerCycle,
      polarCustomerId,
      planAssignedAt: FIXED_NOW,
      creditRefillAt: FIXED_NOW,
      updatedAt: FIXED_NOW
    });
  });
});
