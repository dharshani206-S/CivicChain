import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Shield,
  ArrowLeft,
  Loader2,
  PieChart,
  CheckCircle2,
  ThumbsUp
} from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

const AuthorityStats = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const [authorityAnalytics, setAuthorityAnalytics] = useState<{
    department: string;
    stats: {
      total: number;
      pending: number;
      inProgress: number;
      resolved: number;
      critical: number;
      resolutionRate: number;
      mostReportedCategory: string;
      mostUpvotedTitle: string;
      mostUpvotedVotes: number;
    };
    charts: {
      byStatus: { pending: number; inProgress: number; resolved: number; critical: number };
      bySeverity: { Low: number; Medium: number; High: number; Critical: number };
      byCategory: Record<string, number>;
      overTime: Record<string, number>;
    };
  } | null>(null);

  const fetchIssues = () => {
    setLoading(true);
    issuesAPI
      .getAll()
      .then((res) => {
        const arr = toIssueArray(res.data);
        setIssues(arr);
      })
      .catch((err) => console.error("Failed to load issues:", err))
      .finally(() => setLoading(false));

    if (user?.role === "authority" || user?.role === "admin") {
      issuesAPI
        .getAuthorityAnalytics()
        .then((res) => {
          if (res.data?.success) {
            setAuthorityAnalytics(res.data);
          }
        })
        .catch((err) => console.warn("Authority analytics notice:", err));
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [user]);

  // Department lock safeguard for issues
  const departmentIssues = useMemo(() => {
    if (user?.role === "authority" && user.department) {
      return issues.filter((i) => i.department === user.department);
    }
    return issues;
  }, [issues, user]);

  const stats = useMemo(() => {
    if (authorityAnalytics?.stats) {
      return authorityAnalytics.stats;
    }
    const total = departmentIssues.length;
    const pending = departmentIssues.filter((i) => i.status === "pending").length;
    const inProgress = departmentIssues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = departmentIssues.filter((i) => i.status === "resolved").length;
    const critical = departmentIssues.filter((i) => i.votes >= 50 || i.severity === "Critical").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      resolved,
      critical,
      resolutionRate,
      mostReportedCategory: "General",
      mostUpvotedTitle: "None",
      mostUpvotedVotes: 0
    };
  }, [departmentIssues, authorityAnalytics]);

  const cards = [
    { key: "all", label: "Total Logs", value: stats.total, icon: FileText, style: "bg-zinc-100 text-zinc-800 border-zinc-200", ring: "ring-zinc-400" },
    { key: "pending", label: "Pending", value: stats.pending, icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 border-amber-500/20", ring: "ring-amber-400" },
    { key: "in-progress", label: "In Progress", value: stats.inProgress, icon: Clock, style: "bg-primary/10 text-primary border-primary/20", ring: "ring-primary" },
    { key: "resolved", label: "Resolved", value: stats.resolved, icon: CheckCircle, style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ring: "ring-emerald-400" },
    { key: "critical", label: "Critical Priority", value: stats.critical, icon: TrendingUp, style: "bg-rose-500/10 text-rose-600 border-rose-500/20", ring: "ring-rose-400" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/authority"
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-all shadow-sm"
              aria-label="Back to Control Panel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">Department Analytics</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-950 truncate">
                Authority Statistical Reports
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono">
              {user?.department || "General"} Operations
            </span>
          </div>
        </div>

        {/* 5 Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {cards.map((c) => {
            const CardIcon = c.icon;
            const isSelected = activeTab === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveTab(c.key)}
                className={`text-left rounded-xl border bg-white p-4 shadow-sm space-y-2 transition-all hover:shadow-md ${
                  isSelected ? `ring-2 ${c.ring} border-transparent` : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">{c.label}</span>
                  <div className={`rounded-md p-1 border ${c.style}`}>
                    <CardIcon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                  {loading ? <span className="text-zinc-300">–</span> : c.value}
                </p>
              </button>
            );
          })}
        </div>

        {/* Secondary Analytical Insights */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Resolution Efficiency</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{stats.resolutionRate}%</p>
            <p className="text-[11px] text-zinc-400 font-medium">Percent of total tickets marked resolved</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Department Queue</span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-extrabold text-zinc-900 tracking-tight truncate">{user?.department || "All Departments"}</p>
            <p className="text-[11px] text-zinc-400 font-medium">Assigned administrative scope</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Top Upvoted Complaint</span>
              <ThumbsUp className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-zinc-900 truncate">
              {stats.mostUpvotedTitle || "N/A"}
            </p>
            <p className="text-[11px] text-zinc-400 font-medium font-mono">{stats.mostUpvotedVotes || 0} Upvotes logged</p>
          </div>
        </div>

        {/* Status Distribution Summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-150 pb-3">
            <PieChart className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-sm font-bold text-zinc-900">Incident Pipeline Breakdown</h3>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Pending Review", count: stats.pending, color: "bg-amber-500" },
                { label: "In Progress / Dispatched", count: stats.inProgress, color: "bg-primary" },
                { label: "Resolved", count: stats.resolved, color: "bg-emerald-500" },
                { label: "Critical Priority", count: stats.critical, color: "bg-rose-500" },
              ].map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-zinc-700">{item.label}</span>
                      <span className="text-zinc-500 font-mono">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthorityStats;
