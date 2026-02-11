import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Store, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useLocation } from "wouter";

const COLORS = ["#4ade80", "#60a5fa", "#facc15", "#a78bfa", "#f87171", "#fb923c", "#34d399", "#818cf8"];

function formatKWD(value: number | null | undefined) {
  if (value == null) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPct(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string; value: string; subtitle?: string;
  icon: any; trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1">
                {trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
                {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-400" />}
                <p className={`text-xs ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                  {subtitle}
                </p>
              </div>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: metrics, isLoading: metricsLoading } = trpc.financial.aggregateMetrics.useQuery();
  const { data: topStores, isLoading: topLoading } = trpc.financial.rankings.useQuery({ metric: "sales", limit: 10, order: "top" });
  const { data: companyVar, isLoading: varLoading } = trpc.financial.companyVariance.useQuery();

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Financial Overview</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const salesVsBudget = metrics ? ((metrics.totalSales - metrics.totalBudget) / metrics.totalBudget * 100).toFixed(1) : "0";
  const salesVsBudgetUp = metrics ? metrics.totalSales > metrics.totalBudget : false;

  // Revenue breakdown from company variance
  const revenueItems = companyVar?.filter(v =>
    ["Beverage Sales", "Food Sales", "Grab N Go Sales", "Merchandise sales", "Beans and Tea sales"].includes(v.lineItem)
  ).map(v => ({
    name: v.lineItem.replace(" Sales", "").replace(" sales", ""),
    value: Math.abs(v.ytdActual || 0)
  })).filter(v => v.value > 0) || [];

  // Top stores bar chart
  const topStoresChart = topStores?.map(s => ({
    name: s.storeName.length > 15 ? s.storeName.substring(0, 15) + "..." : s.storeName,
    fullName: s.storeName,
    sales: Math.round(s.sales || 0),
    netProfit: Math.round(s.netProfit || 0),
  })) || [];

  // Cost breakdown
  const costData = metrics ? [
    { name: "COGS", value: Math.abs(metrics.totalCogs || 0) },
    { name: "Staff", value: Math.abs(metrics.totalStaffCost || 0) },
    { name: "Rent", value: Math.abs(metrics.totalRent || 0) },
    { name: "Overhead", value: Math.abs(metrics.totalOverhead || 0) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Gulf Coffee Company - December 2025 YTD Report</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`KWD ${formatKWD(metrics?.totalSales)}`}
          subtitle={`${salesVsBudgetUp ? "+" : ""}${salesVsBudget}% vs Budget`}
          icon={DollarSign}
          trend={salesVsBudgetUp ? "up" : "down"}
        />
        <MetricCard
          title="Gross Profit"
          value={`KWD ${formatKWD(metrics?.totalGrossProfit)}`}
          subtitle={`${formatPct(metrics?.avgGrossProfitPct)} avg margin`}
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title="Net Profit"
          value={`KWD ${formatKWD(metrics?.totalNetProfit)}`}
          subtitle={`${formatPct(metrics?.avgNetProfitPct)} avg margin`}
          icon={metrics?.totalNetProfit && metrics.totalNetProfit > 0 ? TrendingUp : TrendingDown}
          trend={metrics?.totalNetProfit && metrics.totalNetProfit > 0 ? "up" : "down"}
        />
        <MetricCard
          title="Store Performance"
          value={`${metrics?.profitableStores || 0} / ${metrics?.storeCount || 0}`}
          subtitle={`${metrics?.lossStores || 0} stores in loss`}
          icon={Store}
          trend={metrics?.profitableStores && metrics?.storeCount && metrics.profitableStores / metrics.storeCount > 0.7 ? "up" : "down"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores Bar Chart */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top 10 Stores by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStoresChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tickFormatter={(v) => formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`KWD ${value.toLocaleString()}`, '']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="sales" fill="#4ade80" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueItems}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueItems.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`KWD ${formatKWD(value)}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                    formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Cost Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {costData.map((_, index) => (
                      <Cell key={index} fill={["#f87171", "#60a5fa", "#facc15", "#a78bfa"][index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`KWD ${formatKWD(value)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* YoY Variance Summary */}
        <Card className="bg-card border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Year-over-Year Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companyVar?.filter(v =>
                ["Beverage Sales", "Food Sales", "Grab N Go Sales", "NET SALES", "GROSS PROFIT", "OPERATING PROFIT", "NET PROFIT/LOSS"].includes(v.lineItem)
              ).map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{v.lineItem}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">KWD {formatKWD(v.ytdActual)}</span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      (v.ytdVarLastyearPct || 0) > 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {(v.ytdVarLastyearPct || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {formatPct(v.ytdVarLastyearPct)} YoY
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      (v.ytdVarBudgetPct || 0) > 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {(v.ytdVarBudgetPct || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {formatPct(v.ytdVarBudgetPct)} vs Budget
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
