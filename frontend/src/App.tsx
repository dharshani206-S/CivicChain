import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const CitizenLogin = lazy(() => import("./pages/CitizenLogin"));
const AuthorityLogin = lazy(() => import("./pages/AuthorityLogin"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReportIssue = lazy(() => import("./pages/ReportIssue"));
const Issues = lazy(() => import("./pages/Issues"));
const IssueDetails = lazy(() => import("./pages/IssueDetails"));
const AuthorityDashboard = lazy(() => import("./pages/AuthorityDashboard"));
const AuthorityIssues = lazy(() => import("./pages/AuthorityIssues"));
const AuthorityUpvoted = lazy(() => import("./pages/AuthorityUpvoted"));
const AuthorityHeatMap = lazy(() => import("./pages/AuthorityHeatMap"));
const AuthorityStats = lazy(() => import("./pages/AuthorityStats"));
const MyStats = lazy(() => import("./pages/MyStats"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
