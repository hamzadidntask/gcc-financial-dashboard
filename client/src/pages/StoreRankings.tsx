import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

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

type SortField = "sales" | "netProfit" | "grossProfit" | "operatingProfit" | "netProfitPct" | "grossProfitPct";

export default function StoreRankings() {
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState<SortField>("sales");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const { data: allStores, isLoading } = trpc.financial.allStores.useQuery();

  const filteredStores = useMemo(() => {
    if (!allStores) return [];
    let filtered = allStores.filter(s =>
      s.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? 0;
      const bVal = (b as any)[sortBy] ?? 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
    return filtered;
  }, [allStores, searchTerm, sortBy, sortDir]);

  const chartData = useMemo(() => {
    return filteredStores.slice(0, 15).map(s => ({
      name: s.storeName.length > 18 ? s.storeName.substring(0, 18) + "..." : s.storeName,
      fullName: s.storeName,
      value: Math.round((s as any)[sortBy] || 0),
    }));
  }, [filteredStores, sortBy]);

  const metricLabels: Record<string, string> = {
    sales: "Revenue (KWD)",
    netProfit: "Net Profit (KWD)",
    grossProfit: "Gross Profit (KWD)",
    operatingProfit: "Operating Profit (KWD)",
    netProfitPct: "Net Profit %",
    grossProfitPct: "Gross Profit %",
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Store Rankings</h1></div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Store Performance Rankings</h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredStores.length} stores ranked by {metricLabels[sortBy]}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stores..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Revenue</SelectItem>
              <SelectItem value="netProfit">Net Profit</SelectItem>
              <SelectItem value="grossProfit">Gross Profit</SelectItem>
              <SelectItem value="operatingProfit">Operating Profit</SelectItem>
              <SelectItem value="netProfitPct">Net Profit %</SelectItem>
              <SelectItem value="grossProfitPct">Gross Profit %</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top 15 by {metricLabels[sortBy]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tickFormatter={(v) => sortBy.includes("Pct") ? `${(v*100).toFixed(0)}%` : formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                  formatter={(value: number) => [sortBy.includes("Pct") ? `${(value*100).toFixed(1)}%` : `KWD ${value.toLocaleString()}`, '']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">All Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Store</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">GP %</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">OP</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">Net Profit</th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">NP %</th>
                  <th className="text-center py-3 px-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store, i) => (
                  <tr
                    key={store.id}
                    className="border-b border-border/20 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/store/${encodeURIComponent(store.storeName)}`)}
                  >
                    <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 px-3 text-foreground font-medium">{store.storeName}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">KWD {formatKWD(store.sales)}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">{formatPct(store.grossProfitPct)}</td>
                    <td className="py-2.5 px-3 text-right text-foreground">KWD {formatKWD(store.operatingProfit)}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${(store.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      KWD {formatKWD(store.netProfit)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-foreground">{formatPct(store.netProfitPct)}</td>
                    <td className="py-2.5 px-3 text-center">
                      {(store.netProfit || 0) > 0 ? (
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" /> Profit
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10 text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" /> Loss
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
