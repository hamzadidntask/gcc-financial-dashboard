import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, Sparkles, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

export default function AnomalyDetection() {
  const { data: anomalies, isLoading } = trpc.financial.anomalies.useQuery();
  const [explanation, setExplanation] = useState<string | null>(null);
  const explainMutation = trpc.ai.explainAnomalies.useMutation({
    onSuccess: (data) => setExplanation(typeof data === 'string' ? data : String(data)),
  });

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "high": return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "medium": return <AlertCircle className="h-4 w-4 text-amber-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-400 border-red-400/30 bg-red-400/10";
      case "medium": return "text-amber-400 border-amber-400/30 bg-amber-400/10";
      default: return "text-blue-400 border-blue-400/30 bg-blue-400/10";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "Underperforming": return "text-red-400 border-red-400/30 bg-red-400/10";
      case "Outperforming": return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
      case "Low Margin": return "text-amber-400 border-amber-400/30 bg-amber-400/10";
      case "Budget Miss": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
      default: return "text-muted-foreground border-border bg-accent";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Anomaly Detection</h1></div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const highSeverity = anomalies?.filter(a => a.severity === "high") || [];
  const medSeverity = anomalies?.filter(a => a.severity === "medium") || [];
  const lowSeverity = anomalies?.filter(a => a.severity === "low") || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anomaly Detection</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered detection of unusual patterns in financial performance
          </p>
        </div>
        <Button
          onClick={() => anomalies && explainMutation.mutate({ anomalies })}
          disabled={explainMutation.isPending || !anomalies?.length}
          className="gap-2"
        >
          {explainMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Explain All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-red-400/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-400/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{highSeverity.length}</p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-amber-400/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{medSeverity.length}</p>
              <p className="text-xs text-muted-foreground">Medium Severity</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-blue-400/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-400/10">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{lowSeverity.length}</p>
              <p className="text-xs text-muted-foreground">Positive Outliers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Explanation */}
      {explanation && (
        <Card className="bg-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown>{explanation}</Streamdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly List */}
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Detected Anomalies ({anomalies?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {anomalies?.map((anomaly, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-accent/20 transition-colors">
                <div className="flex items-center gap-3">
                  {severityIcon(anomaly.severity)}
                  <div>
                    <p className="text-sm font-medium text-foreground">{anomaly.storeName}</p>
                    <p className="text-xs text-muted-foreground">{anomaly.metric}: {
                      typeof anomaly.value === 'number'
                        ? anomaly.metric.includes('%') || anomaly.metric.includes('vs')
                          ? `${(anomaly.value * 100).toFixed(1)}%`
                          : anomaly.value.toFixed(2)
                        : anomaly.value
                    }</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${typeColor(anomaly.type)}`}>{anomaly.type}</Badge>
                  <Badge variant="outline" className={`text-xs ${severityColor(anomaly.severity)}`}>{anomaly.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
