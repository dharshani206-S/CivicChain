import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { issuesAPI } from "@/services/api";
import {
  FileText,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowLeft,
  BarChart3,
  Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

const statusTabs = [
  { key: "all",         label: "All",         icon: FileText,      style: "bg-zinc-100 text-zinc-800 border-zinc-200" },
  { key: "pending",     label: "Pending",     icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { key: "in-progress", label: "In Progress", icon: Clock,         style: "bg-primary/10 text-primary border-primary/20" },
  { key: "resolved",    label: "Resolved",    icon: CheckCircle,   style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
];

const MyStats = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "all");

  useEffect(() => {
    if (user?.role === "authority") navigate("/authority", { replace: true });
    if (isAuthenticated === false) navigate("/login/citizen", { replace: true });
  }, [user, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    issuesAPI
      .getMyIssues()
      .then((res) => setMyIssues(toIssueArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const stats = useMemo(() => ({
    total:      myIssues.length,
    pending:    myIssues.filter((i) => i.status === "pending").length,
    inProgress: myIssues.filter((i) => i.status === "in-progress" || i.status === "progress").length,
    resolved:   myIssues.filter((i) => i.status === "resolved").length,
  }), [myIssues]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return myIssues;
    if (activeTab === "in-progress") return myIssues.filter((i) => i.status === "in-progress" || i.status === "progress");
    return myIssues.filter((i) => i.status === activeTab);
  }, [myIssues, activeTab]);

  const cards = [
    { key: "all",         label: "Total Reports",  value: stats.total,      icon: FileText,      activeStyle: "ring-2 ring-zinc-400 border-transparent",    iconStyle: "bg-zinc-100 text-zinc-800 border-zinc-200" },
    { key: "pending",     label: "Pending Action", value: stats.pending,    icon: AlertTriangle, activeStyle: "ring-2 ring-amber-400 border-transparent",   iconStyle: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { key: "in-progress", label: "In Progress",    value: stats.inProgress, icon: Clock,         activeStyle: "ring-2 ring-primary border-transparent",     iconStyle: "bg-primary/10 text-primary border-primary/20" },
    { key: "resolved",    label: "Resolved",       value: stats.resolved,   icon: CheckCircle,   activeStyle: "ring-2 ring-emerald-400 border-transparent", iconStyle: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" aria-label="Back to Dashboard"
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-all shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-mono">My Report Stats</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 leading-tight truncate">
                {user?.name ? `${user.name}'s Reports` : "My Reports"}
              </h1>
            </div>
          </div>
          <Link to="/report"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 sm:px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Report Issue</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            const isSelected = activeTab === c.key;
            return (
              <button key={c.key} onClick={() => setActiveTab(c.key)}
                className={`text-left rounded-xl border bg-white p-4 shadow-sm space-y-3 transition-all active:scale-[0.97] hover:shadow-md ${isSelected ? c.activeStyle : "border-zinc-200 hover:border-zinc-300"}`}>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 leading-tight">{c.label}</span>
                  <div className={`shrink-0 rounded-md p-1 border ${c.iconStyle}`}><Icon className="h-3.5 w-3.5" /></div>
                </div>
                <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                  {loading ? <span className="text-zinc-300">–</span> : c.value}
                </p>
                {isSelected && (
                  <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Viewing</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {statusTabs.map((tab) => {
            const TabIcon = tab.icon;
            const count = tab.key === "all" ? stats.total : tab.key === "in-progress" ? stats.inProgress : tab.key === "pending" ? stats.pending : stats.resolved;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-all ${activeTab === tab.key ? `${tab.style} shadow-sm` : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}>
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab.key ? "bg-white/60" : "bg-zinc-100 text-zinc-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Issues */}
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((issue) => (
              <IssueCard key={issue._id} issue={issue} onDelete={(id) => setMyIssues((p) => p.filter((i) => i._id !== id))} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 sm:p-14 text-center space-y-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary mx-auto">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-zinc-900">No {activeTab === "all" ? "" : activeTab} reports</h4>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                {activeTab === "all" ? "You haven't submitted any reports yet." : `No reports with status "${activeTab}" right now.`}
              </p>
            </div>
            {activeTab === "all" && (
              <Link to="/report" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary/95 transition-all">
                <PlusCircle className="h-4 w-4" /> Report New Issue
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MyStats;



