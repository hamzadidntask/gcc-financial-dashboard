import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search } from "lucide-react";

function formatKWD(value: number | null | undefined) {
  if (value == null) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function PivotAnalysis() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: pivotData, isLoading } = trpc.financial.pivotData.useQuery();

  const filtered = useMemo(() => {
    if (!pivotData) return [];
    if (!searchTerm) return pivotData;
    return pivotData.filter(p =>
      p.glAccount.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pivotData, searchTerm]);

  // Top accounts by absolute total for chart
  const chartData = useMemo(() => {
    if (!pivotData) return [];
    return pivotData
      .filter(p => p.total != null && Math.abs(p.total) > 0)
      .sort((a, b) => Math.abs(b.total || 0) - Math.abs(a.total || 0))
      .slice(0, 15)
      .map(p => ({
        name: p.glAccount.length > 25 ? p.glAccount.substring(0, 25) + "..." : p.glAccount,
        fullName: p.glAccount,
        value: Math.round(p.total || 0),
        absValue: Math.round(Math.abs(p.total || 0)),
      }));
  }, [pivotData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Pivot Analysis</h1></div>
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">GL Account Pivot Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} GL accounts analyzed</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GL accounts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Top Accounts Chart */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top 15 GL Accounts by Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tickFormatter={(v) => formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                  formatter={(value: number) => [`KWD ${value.toLocaleString()}`, 'Total']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="absValue" fill="#4ade80" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pivot Table */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">GL Account Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">GL Account</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Total (KWD)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-accent/20">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 text-foreground font-medium">{row.glAccount}</td>
                    <td className={`py-2 px-3 text-right font-medium ${(row.total || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      KWD {formatKWD(row.total)}
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
