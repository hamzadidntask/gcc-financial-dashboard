import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { ArrowLeft, Sparkles, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Streamdown } from "streamdown";

function formatKWD(value: number | null | undefined) {
  if (value == null) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

export default function StoreDetail() {
  const [, params] = useRoute("/store/:name");
  const [, setLocation] = useLocation();
  const storeName = decodeURIComponent(params?.name || "");
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const { data, isLoading } = trpc.financial.storeDetail.useQuery({ storeName });
  const { data: metrics } = trpc.financial.aggregateMetrics.useQuery();
  const insightsMutation = trpc.ai.storeInsights.useMutation({
    onSuccess: (d) => setAiInsights(typeof d === 'string' ? d : String(d)),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const store = data?.store;
  const variance = data?.variance || [];

  if (!store) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/rankings")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Store not found.</p>
      </div>
    );
  }

  const keyVariance = variance.filter(v =>
    ["NET SALES", "GROSS PROFIT", "OPERATING PROFIT", "NET PROFIT/LOSS", "TOTAL COGS", "TOTAL EMPLOYEE COSTS"].includes(v.lineItem)
  );

  const varianceChart = keyVariance.map(v => ({
    name: v.lineItem.replace("TOTAL ", "").replace("NET PROFIT/LOSS", "Net Profit"),
    actual: Math.round(Math.abs(v.ytdActual || 0)),
    budget: Math.round(Math.abs(v.ytdBudget || 0)),
  }));

  // Radar chart comparing store vs company avg
  const radarData = [
    { metric: "GP %", store: (store.grossProfitPct || 0) * 100, avg: (metrics?.avgGrossProfitPct || 0) * 100 },
    { metric: "NP %", store: (store.netProfitPct || 0) * 100, avg: (metrics?.avgNetProfitPct || 0) * 100 },
    { metric: "OP %", store: (store.operatingProfitPct || 0) * 100, avg: (metrics?.avgOperatingProfitPct || 0) * 100 },
    { metric: "Rent %", store: (store.rentPct || 0) * 100, avg: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/rankings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{store.storeName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">Opened: {store.openingDate || "N/A"}</span>
              {store.age && <Badge variant="outline" className="text-xs">{store.age}</Badge>}
            </div>
          </div>
        </div>
        <Button
          onClick={() => insightsMutation.mutate({ storeName: store.storeName })}
          disabled={insightsMutation.isPending}
          className="gap-2"
        >
          {insightsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Analysis
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: `KWD ${formatKWD(store.sales)}`, sub: `Budget: KWD ${formatKWD(store.budget)}` },
          { label: "Gross Profit", value: `KWD ${formatKWD(store.grossProfit)}`, sub: `${formatPct(store.grossProfitPct)} margin` },
          { label: "Operating Profit", value: `KWD ${formatKWD(store.operatingProfit)}`, sub: `${formatPct(store.operatingProfitPct)} margin` },
          { label: "Net Profit", value: `KWD ${formatKWD(store.netProfit)}`, sub: `${formatPct(store.netProfitPct)} margin`, isProfit: (store.netProfit || 0) > 0 },
        ].map((kpi, i) => (
          <Card key={i} className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 ${kpi.isProfit !== undefined ? (kpi.isProfit ? "text-emerald-400" : "text-red-400") : "text-foreground"}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">YTD Actual vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceChart} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={(v) => formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`KWD ${value.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="actual" fill="#4ade80" name="Actual" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="budget" fill="#60a5fa" name="Budget" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Store vs Company Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Radar name="Store" dataKey="store" stroke="#4ade80" fill="#4ade80" fillOpacity={0.2} />
                  <Radar name="Company Avg" dataKey="avg" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.1} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">P&L Variance Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Line Item</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Dec Actual</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">YTD Actual</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">YTD Budget</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Var %</th>
                </tr>
              </thead>
              <tbody>
                {keyVariance.map((v, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-accent/20">
                    <td className="py-2 px-3 text-foreground font-medium">{v.lineItem}</td>
                    <td className="py-2 px-3 text-right">KWD {formatKWD(v.decActual)}</td>
                    <td className="py-2 px-3 text-right">KWD {formatKWD(v.ytdActual)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">KWD {formatKWD(v.ytdBudget)}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`inline-flex items-center gap-1 ${(v.ytdVarBudgetPct || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(v.ytdVarBudgetPct || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatPct(v.ytdVarBudgetPct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {aiInsights && (
        <Card className="bg-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown>{aiInsights}</Streamdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
