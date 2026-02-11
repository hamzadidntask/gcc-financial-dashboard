import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

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

const KEY_LINE_ITEMS = [
  "Beverage Sales", "Food Sales", "Grab N Go Sales", "Merchandise sales",
  "NET SALES", "TOTAL COGS", "GROSS PROFIT",
  "TOTAL EMPLOYEE COSTS", "TOTAL MARKETING EXP.",
  "TOTAL CONTROLLABLES", "TOTAL NON-CONTROLLS",
  "OPERATING PROFIT", "NET PROFIT/LOSS"
];

export default function PLVariance() {
  const [selectedStore, setSelectedStore] = useState("GULF COFFEE CO");
  const { data: allStores } = trpc.financial.allStores.useQuery();
  const { data: variance, isLoading } = trpc.financial.storeVariance.useQuery({ storeName: selectedStore });

  const storeNames = useMemo(() => {
    const names = ["GULF COFFEE CO"];
    if (allStores) {
      names.push(...allStores.map(s => s.storeName).sort());
    }
    return Array.from(new Set(names));
  }, [allStores]);

  const keyItems = useMemo(() => {
    if (!variance) return [];
    return variance.filter(v => KEY_LINE_ITEMS.includes(v.lineItem));
  }, [variance]);

  const chartData = useMemo(() => {
    return keyItems
      .filter(v => v.ytdActual != null && v.lineItem !== "NET SALES")
      .map(v => ({
        name: v.lineItem.replace("TOTAL ", "").replace("NET PROFIT/LOSS", "Net Profit"),
        actual: Math.round(Math.abs(v.ytdActual || 0)),
        budget: Math.round(Math.abs(v.ytdBudget || 0)),
        lastYear: Math.round(Math.abs(v.ytdLastyear || 0)),
      }));
  }, [keyItems]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">P&L Variance Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Budget vs Actual vs Last Year comparison</p>
        </div>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent>
            {storeNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          {/* Variance Chart */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">YTD Comparison: Actual vs Budget vs Last Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 10, right: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={(v) => formatKWD(v)} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                      formatter={(value: number) => [`KWD ${value.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="actual" fill="#4ade80" name="YTD Actual" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="budget" fill="#60a5fa" name="YTD Budget" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="lastYear" fill="#a78bfa" name="Last Year" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Variance Table */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Detailed Variance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-muted-foreground font-medium">Line Item</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">Dec Actual</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">YTD Actual</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">YTD Budget</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">Var Budget</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">YTD Last Year</th>
                      <th className="text-right py-3 px-3 text-muted-foreground font-medium">Var YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyItems.map((item, i) => {
                      const isHeader = ["NET SALES", "GROSS PROFIT", "OPERATING PROFIT", "NET PROFIT/LOSS"].includes(item.lineItem);
                      return (
                        <tr key={i} className={`border-b border-border/20 hover:bg-accent/30 transition-colors ${isHeader ? "bg-accent/20 font-semibold" : ""}`}>
                          <td className="py-2.5 px-3 text-foreground">{item.lineItem}</td>
                          <td className="py-2.5 px-3 text-right text-foreground">KWD {formatKWD(item.decActual)}</td>
                          <td className="py-2.5 px-3 text-right text-foreground">KWD {formatKWD(item.ytdActual)}</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">KWD {formatKWD(item.ytdBudget)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-flex items-center gap-1 ${(item.ytdVarBudgetPct || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {(item.ytdVarBudgetPct || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {formatPct(item.ytdVarBudgetPct)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">KWD {formatKWD(item.ytdLastyear)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`inline-flex items-center gap-1 ${(item.ytdVarLastyearPct || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {(item.ytdVarLastyearPct || 0) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {formatPct(item.ytdVarLastyearPct)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
