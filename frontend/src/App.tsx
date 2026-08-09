import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import CitizenLogin from "./pages/CitizenLogin";
import AuthorityLogin from "./pages/AuthorityLogin";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ReportIssue from "./pages/ReportIssue";
import Issues from "./pages/Issues";
import IssueDetails from "./pages/IssueDetails";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import AuthorityIssues from "./pages/AuthorityIssues";
import AuthorityUpvoted from "./pages/AuthorityUpvoted";
import AuthorityHeatMap from "./pages/AuthorityHeatMap";
import AuthorityStats from "./pages/AuthorityStats";
import MyStats from "./pages/MyStats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC VISITOR ACCESSIBLE ROUTES */}
            <Route path="/" element={<Landing />} />
            <Route path="/login/citizen" element={<CitizenLogin />} />
            <Route path="/login/authority" element={<AuthorityLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/issues/:id" element={<IssueDetails />} />

            {/* CITIZEN AUTHENTICATED ROUTES */}
            <Route path="/report" element={<ProtectedRoute requiredRole="citizen"><ReportIssue /></ProtectedRoute>} />
            <Route path="/my-stats" element={<ProtectedRoute requiredRole="citizen"><MyStats /></ProtectedRoute>} />

            {/* AUTHORITY AUTHENTICATED SUB-ROUTES */}
            <Route path="/authority" element={<ProtectedRoute requiredRole="authority"><AuthorityDashboard /></ProtectedRoute>} />
            <Route path="/authority/dashboard" element={<ProtectedRoute requiredRole="authority"><AuthorityDashboard /></ProtectedRoute>} />
            <Route path="/authority/stats" element={<ProtectedRoute requiredRole="authority"><AuthorityStats /></ProtectedRoute>} />
            <Route path="/authority/issues" element={<ProtectedRoute requiredRole="authority"><AuthorityIssues /></ProtectedRoute>} />
            <Route path="/authority/issues/:id" element={<ProtectedRoute requiredRole="authority"><IssueDetails /></ProtectedRoute>} />
            <Route path="/authority/upvoted" element={<ProtectedRoute requiredRole="authority"><AuthorityUpvoted /></ProtectedRoute>} />
            <Route path="/authority/heatmap" element={<ProtectedRoute requiredRole="authority"><AuthorityHeatMap /></ProtectedRoute>} />
            
            {/* FALLBACK NOT FOUND ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
