import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Search, Sparkles, Loader2 } from "lucide-react";

const COLORS = ["#4ade80", "#60a5fa", "#facc15", "#a78bfa", "#f87171", "#fb923c", "#34d399", "#818cf8"];

function formatKWD(value: number | null | undefined) {
  if (value == null) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

const EXAMPLE_QUERIES = [
  "Which stores are most profitable?",
  "Show me the top 5 stores by revenue",
  "Which stores have the lowest gross margin?",
  "Compare the top and bottom performers",
  "Show revenue distribution across all stores",
  "Which stores missed their budget?",
];

export default function NLQuery() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);

  const nlMutation = trpc.ai.nlQuery.useMutation({
    onSuccess: (data) => setResult(data),
  });

  const handleQuery = (q?: string) => {
    const queryText = q || query;
    if (!queryText.trim()) return;
    setQuery(queryText);
    nlMutation.mutate({ query: queryText });
  };

  const renderChart = () => {
    if (!result?.query || !result?.data?.length) return null;
    const { chartType, metric } = result.query;
    const isPct = metric.includes("Pct");

    const chartData = result.data.map((s: any) => ({
      name: s.storeName?.length > 20 ? s.storeName.substring(0, 20) + "..." : s.storeName,
      fullName: s.storeName,
      value: s[metric] || 0,
    }));

    if (chartType === "pie") {
      return (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData.slice(0, 10)} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name }) => name}>
                {chartData.slice(0, 10).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                formatter={(value: number) => [isPct ? `${(value*100).toFixed(1)}%` : `KWD ${value.toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(v) => <span style={{ color: '#d1d5db' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Default: bar chart
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" tickFormatter={(v) => isPct ? `${(v*100).toFixed(0)}%` : formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
              formatter={(value: number) => [isPct ? `${(value*100).toFixed(1)}%` : `KWD ${value.toLocaleString()}`, '']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
            />
            <Bar dataKey="value" fill="#4ade80" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Natural Language Query</h1>
        <p className="text-sm text-muted-foreground mt-1">Ask questions in plain English and get instant visualizations</p>
      </div>

      {/* Query Input */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ask a question about your financial data..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleQuery()}
                className="pl-9 h-11"
              />
            </div>
            <Button onClick={() => handleQuery()} disabled={nlMutation.isPending || !query.trim()} className="gap-2 h-11">
              {nlMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Query
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {EXAMPLE_QUERIES.map((eq, i) => (
              <button
                key={i}
                onClick={() => handleQuery(eq)}
                disabled={nlMutation.isPending}
                className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
              >
                {eq}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {nlMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-80" />
        </div>
      )}

      {/* Results */}
      {result?.query && !nlMutation.isPending && (
        <>
          <Card className="bg-card border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{result.query.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{result.query.queryType}</Badge>
                  <Badge variant="outline" className="text-xs">{result.query.chartType}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{result.query.description}</p>
            </CardHeader>
            <CardContent>
              {renderChart()}
            </CardContent>
          </Card>

          {/* Data Table */}
          {result.query.chartType === "table" || result.data?.length > 0 ? (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Data ({result.data?.length || 0} records)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Store</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Revenue</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Gross Profit</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Net Profit</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">NP %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data?.map((s: any, i: number) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-accent/20">
                          <td className="py-2 px-3 text-foreground">{s.storeName}</td>
                          <td className="py-2 px-3 text-right">KWD {formatKWD(s.sales)}</td>
                          <td className="py-2 px-3 text-right">KWD {formatKWD(s.grossProfit)}</td>
                          <td className={`py-2 px-3 text-right ${(s.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            KWD {formatKWD(s.netProfit)}
                          </td>
                          <td className="py-2 px-3 text-right">{s.netProfitPct != null ? `${(s.netProfitPct * 100).toFixed(1)}%` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {result?.error && (
        <Card className="bg-card border-destructive/30">
          <CardContent className="p-4 text-destructive">
            Could not interpret your query. Please try rephrasing.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
