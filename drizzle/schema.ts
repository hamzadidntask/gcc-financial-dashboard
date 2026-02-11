import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, double, date, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Store master data with P&L summary metrics */
export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 200 }).notNull().unique(),
  openingDate: varchar("openingDate", { length: 20 }),
  age: varchar("age", { length: 20 }),
  sales: double("sales"),
  budget: double("budget"),
  cogs: double("cogs"),
  grossProfit: double("grossProfit"),
  grossProfitPct: double("grossProfitPct"),
  staffCost: double("staffCost"),
  staffCostPct: double("staffCostPct"),
  marketingExp: double("marketingExp"),
  marketingExpPct: double("marketingExpPct"),
  rent: double("rent"),
  rentPct: double("rentPct"),
  royalty: double("royalty"),
  royaltyPct: double("royaltyPct"),
  otherOpex: double("otherOpex"),
  otherOpexPct: double("otherOpexPct"),
  operatingProfit: double("operatingProfit"),
  operatingProfitPct: double("operatingProfitPct"),
  depreciation: double("depreciation"),
  amortization: double("amortization"),
  others: double("others"),
  npBeforeOverhead: double("npBeforeOverhead"),
  overhead: double("overhead"),
  netProfit: double("netProfit"),
  netProfitPct: double("netProfitPct"),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

/** P&L Variance data per store per line item */
export const plVariance = mysqlTable("plVariance", {
  id: int("id").autoincrement().primaryKey(),
  store: varchar("store", { length: 200 }).notNull(),
  lineItem: varchar("lineItem", { length: 200 }).notNull(),
  decActual: double("decActual"),
  decActualPct: double("decActualPct"),
  decBudget: double("decBudget"),
  decBudgetPct: double("decBudgetPct"),
  decLastyear: double("decLastyear"),
  decLastyearPct: double("decLastyearPct"),
  varBudgetAmt: double("varBudgetAmt"),
  varBudgetPct: double("varBudgetPct"),
  varLastyearAmt: double("varLastyearAmt"),
  varLastyearPct: double("varLastyearPct"),
  ytdActual: double("ytdActual"),
  ytdActualPct: double("ytdActualPct"),
  ytdBudget: double("ytdBudget"),
  ytdBudgetPct: double("ytdBudgetPct"),
  ytdLastyear: double("ytdLastyear"),
  ytdLastyearPct: double("ytdLastyearPct"),
  ytdVarBudgetAmt: double("ytdVarBudgetAmt"),
  ytdVarBudgetPct: double("ytdVarBudgetPct"),
  ytdVarLastyearAmt: double("ytdVarLastyearAmt"),
  ytdVarLastyearPct: double("ytdVarLastyearPct"),
});

export type PlVariance = typeof plVariance.$inferSelect;
export type InsertPlVariance = typeof plVariance.$inferInsert;

/** Pivot analysis data - GL account totals */
export const pivotData = mysqlTable("pivotData", {
  id: int("id").autoincrement().primaryKey(),
  glAccount: varchar("glAccount", { length: 200 }).notNull(),
  total: double("total"),
  costCenterData: json("costCenterData"),
});

export type PivotData = typeof pivotData.$inferSelect;
export type InsertPivotData = typeof pivotData.$inferInsert;

/** AI chat history */
export const chatHistory = mysqlTable("chatHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatHistory = typeof chatHistory.$inferSelect;
