import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("financial.allStores", () => {
  it("returns an array of stores", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.allStores();
    expect(Array.isArray(result)).toBe(true);
    // We seeded 101 stores
    expect(result.length).toBeGreaterThan(0);
    // Each store should have key fields
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("storeName");
      expect(result[0]).toHaveProperty("sales");
      expect(result[0]).toHaveProperty("netProfit");
    }
  });
});

describe("financial.aggregateMetrics", () => {
  it("returns aggregate financial metrics", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.aggregateMetrics();
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("totalSales");
    expect(result).toHaveProperty("totalNetProfit");
    expect(result).toHaveProperty("storeCount");
    expect(result).toHaveProperty("profitableStores");
    expect(typeof result!.totalSales).toBe("number");
  });
});

describe("financial.rankings", () => {
  it("returns top stores by sales", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.rankings({ metric: "sales", limit: 5, order: "top" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
    // Should be sorted descending by sales
    if (result.length > 1) {
      expect((result[0].sales || 0)).toBeGreaterThanOrEqual((result[1].sales || 0));
    }
  });

  it("returns bottom stores by netProfit", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.rankings({ metric: "netProfit", limit: 5, order: "bottom" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
    // Should be sorted ascending by netProfit
    if (result.length > 1) {
      expect((result[0].netProfit || 0)).toBeLessThanOrEqual((result[1].netProfit || 0));
    }
  });
});

describe("financial.companyVariance", () => {
  it("returns company-level variance data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.companyVariance();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("lineItem");
      expect(result[0]).toHaveProperty("ytdActual");
    }
  });
});

describe("financial.storeDetail", () => {
  it("returns store and variance data for a valid store", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // First get a store name
    const stores = await caller.financial.allStores();
    if (stores.length > 0) {
      const result = await caller.financial.storeDetail({ storeName: stores[0].storeName });
      expect(result).toHaveProperty("store");
      expect(result).toHaveProperty("variance");
      expect(result.store).not.toBeNull();
      expect(result.store?.storeName).toBe(stores[0].storeName);
    }
  });
});

describe("financial.anomalies", () => {
  it("returns anomaly detections", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.anomalies();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("storeName");
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("severity");
      expect(["high", "medium", "low"]).toContain(result[0].severity);
    }
  });
});

describe("financial.pivotData", () => {
  it("returns pivot analysis data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financial.pivotData();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("glAccount");
      expect(result[0]).toHaveProperty("total");
    }
  });
});
