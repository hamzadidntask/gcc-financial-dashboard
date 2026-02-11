import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  getAllStores, getStoreByName, getTopStores, getBottomStores,
  getVarianceByStore, getVarianceByLineItem, getCompanyVariance,
  getAllPivotData, getAggregateMetrics, getAnomalies,
  saveChatMessage, getChatHistory
} from "./db";

const FINANCIAL_SYSTEM_PROMPT = `You are an expert financial analyst AI assistant for Gulf Coffee Company (GCC), a major coffee chain operating 101+ stores across Kuwait. You have deep expertise in:

1. **P&L Analysis**: You understand Profit & Loss statements intimately - revenue lines (beverage sales, food sales, merchandise, grab & go), COGS, gross profit margins, operating expenses (staff costs, marketing, rent, royalties), operating profit, depreciation, amortization, overhead allocation, and net profit.

2. **Variance Analysis**: You can interpret budget vs actual variances, year-over-year comparisons, and identify significant deviations. You understand that positive variance in revenue is good, while positive variance in costs is bad.

3. **Store Performance**: You can compare stores across multiple KPIs, identify top/bottom performers, and understand factors like store age, location type (mall, co-op, airport, hospital, university), and their impact on performance.

4. **Financial Ratios**: You calculate and interpret gross margin %, operating margin %, net margin %, cost ratios (staff cost %, rent %, COGS %), and efficiency metrics.

5. **Actionable Recommendations**: You provide specific, data-driven recommendations for improving store performance, cost optimization, revenue growth, and strategic decisions.

CRITICAL RULES:
- Always base your analysis on the actual data provided. Never fabricate numbers.
- When comparing stores, consider their age and location type for fair comparison.
- Express percentages clearly (e.g., "28.1% net profit margin").
- Format currency values in KWD (Kuwaiti Dinar) with proper formatting.
- When asked about trends, explain the direction, magnitude, and potential causes.
- Provide specific store names and numbers when making comparisons.
- If data is insufficient for a conclusion, say so clearly.
- Structure your responses with clear headings and bullet points for readability.
- Always end with actionable recommendations when appropriate.

CONTEXT: This is the December 2025 financial report (YTD). The data includes monthly actuals, budgets, and prior year comparisons for all stores.`;

const NL_QUERY_SYSTEM_PROMPT = `You are a natural language to data query translator for Gulf Coffee Company's financial dashboard. Your job is to interpret user questions about financial data and return a structured JSON response that the frontend can use to display the right visualization.

You must return ONLY valid JSON with this structure:
{
  "queryType": "ranking" | "comparison" | "trend" | "distribution" | "detail" | "summary",
  "metric": "sales" | "netProfit" | "grossProfit" | "operatingProfit" | "cogs" | "staffCost" | "rent" | "grossProfitPct" | "netProfitPct" | "operatingProfitPct",
  "stores": ["store1", "store2"] or null for all,
  "chartType": "bar" | "line" | "pie" | "table",
  "title": "Human readable title for the visualization",
  "description": "Brief explanation of what this shows",
  "sortOrder": "asc" | "desc",
  "limit": number or null
}

Examples:
- "Which stores are most profitable?" → ranking, netProfit, desc, limit 10, bar chart
- "Show me revenue distribution" → distribution, sales, pie chart
- "Compare Avenues vs Marina" → comparison, sales, bar chart, stores: ["Avenues", "Marina"]
- "What's the overall company performance?" → summary, all metrics, table

Always pick the most appropriate visualization type for the question.`;

const ANOMALY_EXPLANATION_PROMPT = `You are a financial anomaly analyst for Gulf Coffee Company. Given a list of detected anomalies in store performance data, provide clear, concise explanations for each anomaly and suggest potential root causes and remediation actions.

For each anomaly:
1. Explain what the anomaly means in business terms
2. Suggest 2-3 possible root causes
3. Recommend specific actions to investigate or resolve

Keep explanations brief but actionable. Group related anomalies together. Prioritize high-severity items first.`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Financial data endpoints
  financial: router({
    // Get all stores with P&L summary
    allStores: publicProcedure.query(async () => {
      return getAllStores();
    }),

    // Get single store detail
    storeDetail: publicProcedure
      .input(z.object({ storeName: z.string() }))
      .query(async ({ input }) => {
        const store = await getStoreByName(input.storeName);
        const variance = await getVarianceByStore(input.storeName);
        return { store, variance };
      }),

    // Get top/bottom stores by metric
    rankings: publicProcedure
      .input(z.object({
        metric: z.string().default('sales'),
        limit: z.number().default(10),
        order: z.enum(['top', 'bottom']).default('top')
      }))
      .query(async ({ input }) => {
        if (input.order === 'top') {
          return getTopStores(input.metric, input.limit);
        }
        return getBottomStores(input.metric, input.limit);
      }),

    // Get company-level variance
    companyVariance: publicProcedure.query(async () => {
      return getCompanyVariance();
    }),

    // Get variance for a specific store
    storeVariance: publicProcedure
      .input(z.object({ storeName: z.string() }))
      .query(async ({ input }) => {
        return getVarianceByStore(input.storeName);
      }),

    // Get variance by line item across stores
    lineItemVariance: publicProcedure
      .input(z.object({ lineItem: z.string() }))
      .query(async ({ input }) => {
        return getVarianceByLineItem(input.lineItem);
      }),

    // Get pivot analysis data
    pivotData: publicProcedure.query(async () => {
      return getAllPivotData();
    }),

    // Get aggregate metrics
    aggregateMetrics: publicProcedure.query(async () => {
      return getAggregateMetrics();
    }),

    // Get anomalies
    anomalies: publicProcedure.query(async () => {
      return getAnomalies();
    }),
  }),

  // AI endpoints
  ai: router({
    // Financial insights chat
    chat: publicProcedure
      .input(z.object({
        message: z.string(),
        context: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Get relevant data for context
        const metrics = await getAggregateMetrics();
        const topStores = await getTopStores('sales', 10);
        const bottomStores = await getBottomStores('netProfit', 10);
        const companyVar = await getCompanyVariance();

        const dataContext = `
COMPANY AGGREGATE METRICS:
- Total Sales: KWD ${metrics?.totalSales?.toLocaleString() || 'N/A'}
- Total Budget: KWD ${metrics?.totalBudget?.toLocaleString() || 'N/A'}
- Total COGS: KWD ${metrics?.totalCogs?.toLocaleString() || 'N/A'}
- Total Gross Profit: KWD ${metrics?.totalGrossProfit?.toLocaleString() || 'N/A'}
- Total Operating Profit: KWD ${metrics?.totalOperatingProfit?.toLocaleString() || 'N/A'}
- Total Net Profit: KWD ${metrics?.totalNetProfit?.toLocaleString() || 'N/A'}
- Average Gross Profit %: ${((metrics?.avgGrossProfitPct || 0) * 100).toFixed(1)}%
- Average Net Profit %: ${((metrics?.avgNetProfitPct || 0) * 100).toFixed(1)}%
- Total Stores: ${metrics?.storeCount || 0}
- Profitable Stores: ${metrics?.profitableStores || 0}
- Loss-Making Stores: ${metrics?.lossStores || 0}

TOP 10 STORES BY SALES:
${topStores.map(s => `- ${s.storeName}: Sales KWD ${s.sales?.toLocaleString()}, NP% ${((s.netProfitPct || 0) * 100).toFixed(1)}%`).join('\n')}

BOTTOM 10 STORES BY NET PROFIT:
${bottomStores.map(s => `- ${s.storeName}: NP KWD ${s.netProfit?.toLocaleString()}, NP% ${((s.netProfitPct || 0) * 100).toFixed(1)}%`).join('\n')}

COMPANY P&L VARIANCE (Key Items):
${companyVar.filter(v => ['NET SALES', 'GROSS PROFIT', 'OPERATING PROFIT', 'NET PROFIT/LOSS'].includes(v.lineItem)).map(v => `- ${v.lineItem}: YTD Actual KWD ${v.ytdActual?.toLocaleString()}, vs Budget: ${v.ytdVarBudgetPct ? (v.ytdVarBudgetPct * 100).toFixed(1) + '%' : 'N/A'}, vs Last Year: ${v.ytdVarLastyearPct ? (v.ytdVarLastyearPct * 100).toFixed(1) + '%' : 'N/A'}`).join('\n')}

${input.context ? `ADDITIONAL CONTEXT:\n${input.context}` : ''}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: FINANCIAL_SYSTEM_PROMPT },
            { role: "user", content: `Here is the current financial data:\n${dataContext}\n\nUser question: ${input.message}` }
          ],
        });

        return response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      }),

    // Natural language query
    nlQuery: publicProcedure
      .input(z.object({ query: z.string() }))
      .mutation(async ({ input }) => {
        const allStoresData = await getAllStores();
        const storeNames = allStoresData.map(s => s.storeName).join(', ');

        const response = await invokeLLM({
          messages: [
            { role: "system", content: NL_QUERY_SYSTEM_PROMPT + `\n\nAvailable store names: ${storeNames}` },
            { role: "user", content: input.query }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "query_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  queryType: { type: "string", enum: ["ranking", "comparison", "trend", "distribution", "detail", "summary"] },
                  metric: { type: "string" },
                  stores: { type: ["array", "null"], items: { type: "string" } },
                  chartType: { type: "string", enum: ["bar", "line", "pie", "table"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  sortOrder: { type: "string", enum: ["asc", "desc"] },
                  limit: { type: ["number", "null"] }
                },
                required: ["queryType", "metric", "stores", "chartType", "title", "description", "sortOrder", "limit"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0]?.message?.content;
        try {
          const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
          // Now fetch the actual data based on the parsed query
          let data: any[] = [];
          if (parsed.stores && parsed.stores.length > 0) {
            data = allStoresData.filter(s => parsed.stores.includes(s.storeName));
          } else if (parsed.queryType === 'ranking') {
            const limit = parsed.limit || 10;
            if (parsed.sortOrder === 'desc') {
              data = await getTopStores(parsed.metric, limit);
            } else {
              data = await getBottomStores(parsed.metric, limit);
            }
          } else {
            data = allStoresData;
          }
          return { query: parsed, data };
        } catch {
          return { query: null, data: [], error: "Could not parse query" };
        }
      }),

    // Anomaly explanations
    explainAnomalies: publicProcedure
      .input(z.object({ anomalies: z.array(z.any()) }))
      .mutation(async ({ input }) => {
        const anomalyText = input.anomalies.map((a: any) =>
          `Store: ${a.storeName}, Type: ${a.type}, Metric: ${a.metric}, Value: ${a.value}, Threshold: ${a.threshold}, Severity: ${a.severity}`
        ).join('\n');

        const response = await invokeLLM({
          messages: [
            { role: "system", content: ANOMALY_EXPLANATION_PROMPT },
            { role: "user", content: `Please analyze these detected anomalies:\n${anomalyText}` }
          ],
        });

        return response.choices[0]?.message?.content || "Unable to generate explanation.";
      }),

    // Store improvement suggestions
    storeInsights: publicProcedure
      .input(z.object({ storeName: z.string() }))
      .mutation(async ({ input }) => {
        const store = await getStoreByName(input.storeName);
        const variance = await getVarianceByStore(input.storeName);
        const metrics = await getAggregateMetrics();

        if (!store) return "Store not found.";

        const storeContext = `
STORE: ${store.storeName}
Opening Date: ${store.openingDate}, Age: ${store.age}
Sales: KWD ${store.sales?.toLocaleString()}, Budget: KWD ${store.budget?.toLocaleString()}
COGS: KWD ${store.cogs?.toLocaleString()}
Gross Profit: KWD ${store.grossProfit?.toLocaleString()} (${((store.grossProfitPct || 0) * 100).toFixed(1)}%)
Staff Cost: KWD ${store.staffCost?.toLocaleString()}
Marketing: KWD ${store.marketingExp?.toLocaleString()}
Rent: KWD ${store.rent?.toLocaleString()} (${((store.rentPct || 0) * 100).toFixed(1)}%)
Operating Profit: KWD ${store.operatingProfit?.toLocaleString()} (${((store.operatingProfitPct || 0) * 100).toFixed(1)}%)
Net Profit: KWD ${store.netProfit?.toLocaleString()} (${((store.netProfitPct || 0) * 100).toFixed(1)}%)

COMPANY AVERAGES:
Avg GP%: ${((metrics?.avgGrossProfitPct || 0) * 100).toFixed(1)}%
Avg NP%: ${((metrics?.avgNetProfitPct || 0) * 100).toFixed(1)}%
Avg OP%: ${((metrics?.avgOperatingProfitPct || 0) * 100).toFixed(1)}%

VARIANCE DATA:
${variance.filter(v => ['NET SALES', 'GROSS PROFIT', 'OPERATING PROFIT', 'NET PROFIT/LOSS'].includes(v.lineItem)).map(v => `${v.lineItem}: Dec Actual=${v.decActual}, YTD=${v.ytdActual}, vs Budget=${v.ytdVarBudgetPct ? (v.ytdVarBudgetPct * 100).toFixed(1) + '%' : 'N/A'}, vs LY=${v.ytdVarLastyearPct ? (v.ytdVarLastyearPct * 100).toFixed(1) + '%' : 'N/A'}`).join('\n')}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `${FINANCIAL_SYSTEM_PROMPT}\n\nYou are now providing a detailed performance analysis and improvement recommendations for a specific store. Compare it against company averages and provide 5-7 specific, actionable recommendations.` },
            { role: "user", content: `Provide a detailed performance analysis and improvement recommendations for this store:\n${storeContext}` }
          ],
        });

        return response.choices[0]?.message?.content || "Unable to generate insights.";
      }),
  }),
});

export type AppRouter = typeof appRouter;
