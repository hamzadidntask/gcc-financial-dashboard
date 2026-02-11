import { eq, like, sql, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, stores, plVariance, pivotData, chatHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== Financial Data Queries =====

export async function getAllStores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stores).orderBy(asc(stores.storeName));
}

export async function getStoreByName(name: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stores).where(eq(stores.storeName, name)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTopStores(metric: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const col = metric === 'sales' ? stores.sales
    : metric === 'netProfit' ? stores.netProfit
    : metric === 'grossProfit' ? stores.grossProfit
    : metric === 'operatingProfit' ? stores.operatingProfit
    : stores.sales;
  return db.select().from(stores).orderBy(desc(col)).limit(limit);
}

export async function getBottomStores(metric: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const col = metric === 'sales' ? stores.sales
    : metric === 'netProfit' ? stores.netProfit
    : metric === 'grossProfit' ? stores.grossProfit
    : metric === 'operatingProfit' ? stores.operatingProfit
    : stores.sales;
  return db.select().from(stores).orderBy(asc(col)).limit(limit);
}

export async function getVarianceByStore(storeName: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plVariance).where(eq(plVariance.store, storeName));
}

export async function getVarianceByLineItem(lineItem: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plVariance).where(eq(plVariance.lineItem, lineItem));
}

export async function getCompanyVariance() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plVariance).where(eq(plVariance.store, 'GULF COFFEE CO'));
}

export async function getAllPivotData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pivotData);
}

export async function getAggregateMetrics() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalSales: sql<number>`SUM(${stores.sales})`,
    totalBudget: sql<number>`SUM(${stores.budget})`,
    totalCogs: sql<number>`SUM(${stores.cogs})`,
    totalGrossProfit: sql<number>`SUM(${stores.grossProfit})`,
    totalOperatingProfit: sql<number>`SUM(${stores.operatingProfit})`,
    totalNetProfit: sql<number>`SUM(${stores.netProfit})`,
    totalStaffCost: sql<number>`SUM(${stores.staffCost})`,
    totalRent: sql<number>`SUM(${stores.rent})`,
    totalOverhead: sql<number>`SUM(${stores.overhead})`,
    avgGrossProfitPct: sql<number>`AVG(${stores.grossProfitPct})`,
    avgNetProfitPct: sql<number>`AVG(${stores.netProfitPct})`,
    avgOperatingProfitPct: sql<number>`AVG(${stores.operatingProfitPct})`,
    storeCount: sql<number>`COUNT(*)`,
    profitableStores: sql<number>`SUM(CASE WHEN ${stores.netProfit} > 0 THEN 1 ELSE 0 END)`,
    lossStores: sql<number>`SUM(CASE WHEN ${stores.netProfit} <= 0 THEN 1 ELSE 0 END)`,
  }).from(stores);
  return result[0] || null;
}

export async function getAnomalies() {
  const db = await getDb();
  if (!db) return [];
  // Find stores with extreme metrics (outliers)
  const avgResult = await db.select({
    avgNpPct: sql<number>`AVG(${stores.netProfitPct})`,
    stdNpPct: sql<number>`STDDEV(${stores.netProfitPct})`,
    avgGpPct: sql<number>`AVG(${stores.grossProfitPct})`,
    stdGpPct: sql<number>`STDDEV(${stores.grossProfitPct})`,
    avgSales: sql<number>`AVG(${stores.sales})`,
    stdSales: sql<number>`STDDEV(${stores.sales})`,
  }).from(stores);
  
  const stats = avgResult[0];
  if (!stats) return [];

  // Get all stores and flag anomalies
  const allStores = await db.select().from(stores);
  const anomalies: Array<{
    storeName: string;
    type: string;
    metric: string;
    value: number | null;
    threshold: string;
    severity: 'high' | 'medium' | 'low';
  }> = [];

  for (const store of allStores) {
    // Very high loss
    if (store.netProfitPct !== null && stats.avgNpPct !== null && stats.stdNpPct !== null) {
      if (store.netProfitPct < stats.avgNpPct - 1.5 * stats.stdNpPct) {
        anomalies.push({
          storeName: store.storeName,
          type: 'Underperforming',
          metric: 'Net Profit %',
          value: store.netProfitPct,
          threshold: `Avg: ${(stats.avgNpPct * 100).toFixed(1)}%`,
          severity: store.netProfitPct < stats.avgNpPct - 2 * stats.stdNpPct ? 'high' : 'medium'
        });
      }
      // Exceptionally high profit
      if (store.netProfitPct > stats.avgNpPct + 1.5 * stats.stdNpPct) {
        anomalies.push({
          storeName: store.storeName,
          type: 'Outperforming',
          metric: 'Net Profit %',
          value: store.netProfitPct,
          threshold: `Avg: ${(stats.avgNpPct * 100).toFixed(1)}%`,
          severity: 'low'
        });
      }
    }
    // Very low GP margin
    if (store.grossProfitPct !== null && stats.avgGpPct !== null && stats.stdGpPct !== null) {
      if (store.grossProfitPct < stats.avgGpPct - 1.5 * stats.stdGpPct) {
        anomalies.push({
          storeName: store.storeName,
          type: 'Low Margin',
          metric: 'Gross Profit %',
          value: store.grossProfitPct,
          threshold: `Avg: ${(stats.avgGpPct * 100).toFixed(1)}%`,
          severity: 'medium'
        });
      }
    }
    // Budget overrun (sales below budget significantly)
    if (store.sales !== null && store.budget !== null && store.budget > 0) {
      const budgetVar = (store.sales - store.budget) / store.budget;
      if (budgetVar < -0.2) {
        anomalies.push({
          storeName: store.storeName,
          type: 'Budget Miss',
          metric: 'Sales vs Budget',
          value: budgetVar,
          threshold: 'More than 20% below budget',
          severity: budgetVar < -0.3 ? 'high' : 'medium'
        });
      }
    }
  }

  return anomalies;
}

export async function saveChatMessage(userId: number | null, role: string, content: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatHistory).values({ userId, role, content });
}

export async function getChatHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatHistory)
    .where(eq(chatHistory.userId, userId))
    .orderBy(desc(chatHistory.createdAt))
    .limit(limit);
}
