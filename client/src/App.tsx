import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PLVariance from "./pages/PLVariance";
import StoreRankings from "./pages/StoreRankings";
import AnomalyDetection from "./pages/AnomalyDetection";
import AIInsights from "./pages/AIInsights";
import NLQuery from "./pages/NLQuery";
import StoreDetail from "./pages/StoreDetail";
import PivotAnalysis from "./pages/PivotAnalysis";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/variance" component={PLVariance} />
        <Route path="/rankings" component={StoreRankings} />
        <Route path="/anomalies" component={AnomalyDetection} />
        <Route path="/ai-insights" component={AIInsights} />
        <Route path="/nl-query" component={NLQuery} />
        <Route path="/store/:name" component={StoreDetail} />
        <Route path="/pivot" component={PivotAnalysis} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
