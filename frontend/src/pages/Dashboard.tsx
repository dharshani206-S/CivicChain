import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { issuesAPI } from "@/services/api";
import {
  FileText,
  PlusCircle,
  ThumbsUp,
  AlertTriangle,
  MapPin,
  Clock,
  TrendingUp,
  Search,
  CheckCircle,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  LogIn,
  UserPlus,
  Trash2
} from "lucide-react";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import type { Issue } from "@/types/issue";
import { toIssueArray, getApiErrorMessage } from "@/utils/api";
import { toast } from "sonner";
import { DEPARTMENTS } from "@/constants/departments";
import { motion, AnimatePresence } from "framer-motion";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  critical: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapIssue, setSelectedMapIssue] = useState<Issue | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this complaint?")) return;
    try {
      await issuesAPI.delete(id);
      toast.success("Complaint deleted successfully");
      setIssues((prev) => prev.filter((issue) => issue._id !== id));
      setSelectedMapIssue(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete complaint"));
    }
  };

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  // 1. REDIRECT AUTHORITIES FROM CITIZEN DASHBOARD
  useEffect(() => {
    if (user?.role === "authority") {
      navigate("/authority", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    issuesAPI
      .getAll()
      .then((res) => {
        const data: unknown = res.data;
        const arr = toIssueArray(data);
        setIssues(arr);
        if (arr.length > 0) {
          setSelectedMapIssue(arr[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter Issues based on Search & Department Select
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (issue.location && issue.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = selectedDept === "" || issue.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [issues, searchQuery, selectedDept]);

  // Statistics calculation (cluttered cards removed)
  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const pending = filteredIssues.filter((i) => i.status === "pending").length;
    const inProgress = filteredIssues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = filteredIssues.filter((i) => i.status === "resolved").length;

    return [
      { label: "Total Reports", value: total, icon: FileText, style: "bg-zinc-100 text-zinc-800 border-zinc-200" },
      { label: "Pending", value: pending, icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      { label: "In Progress", value: inProgress, icon: Clock, style: "bg-primary/10 text-primary border-primary/20" },
      { label: "Resolved", value: resolved, icon: CheckCircle, style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    ];
  }, [filteredIssues]);

  // Project filtered issue positions onto mock vector map
  const mapIssuePins = useMemo(() => {
    return filteredIssues.map((issue) => {
      const numId = issue._id.replace(/\D/g, "");
      const seedX = numId ? parseInt(numId.slice(-2)) || 50 : 50;
      const seedY = numId ? parseInt(numId.slice(-4, -2)) || 50 : 50;

      const x = 15 + (seedX % 70) + "%";
      const y = 15 + (seedY % 70) + "%";
      return { ...issue, x, y };
    });
  }, [filteredIssues]);

  const recentIssues = useMemo(() => {
    return [...filteredIssues]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [filteredIssues]);

  const trendingIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => b.votes - a.votes).slice(0, 3);
  }, [filteredIssues]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        
        {/* Welcome Section */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Civic Smart Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mt-1">
              {isAuthenticated ? `Welcome Back, ${user?.name}` : "Explore Municipal Operations"}
            </h1>
            <p className="text-xs text-zinc-500 leading-normal max-w-xl">
              CivicChain connects you directly to city maintenance. Explore geotagged incident maps, review resolution workflows, and report issues.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all"
              >
                <PlusCircle className="h-4 w-4" /> Report New Issue
              </Link>
            ) : (
              <>
                <Link
                  to="/login/citizen"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all"
                >
                  <LogIn className="h-4 w-4" /> Sign In to Report
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-all"
                >
                  <UserPlus className="h-4 w-4 text-zinc-400" /> Create Profile
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter Controls Grid */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 shrink-0">
              <SlidersHorizontal className="h-4 w-4 text-zinc-400" /> Map Filters
            </div>

            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search complaints by title, description or location..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-4 text-xs text-zinc-800 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>

            <div className="w-full md:w-60 shrink-0">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs text-zinc-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Core Metrics Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {stats.map((s, idx) => {
            const StatIcon = s.icon;
            return (
              <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2 hover:border-zinc-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{s.label}</span>
                  <div className={`rounded-md p-1 border ${s.style}`}>
                    <StatIcon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Geotagged Map and Sidebar */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          
          {/* Geotagged Map Vector */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Geotagged Issues Mapping Grid</h3>
              <p className="text-[10px] text-zinc-400">Interactive dispatch vector coordinate grid.</p>
            </div>
            
            <div className="relative aspect-video w-full rounded-lg border border-zinc-150 bg-zinc-50 overflow-hidden mt-4">
              <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0,30 L 1000,400 M 50,0 L 150,500 M 350,0 L 400,500 M 0,200 L 1000,180 M 0,350 L 1000,320" stroke="#000" strokeWidth="2" fill="none" />
                <rect x="100" y="50" width="80" height="80" rx="4" fill="#000" />
                <rect x="400" y="120" width="150" height="90" rx="4" fill="#000" />
              </svg>

              {mapIssuePins.map((pin) => {
                const isSelected = selectedMapIssue?._id === pin._id;
                let colorClass = "bg-amber-500";
                if (pin.status === "resolved") colorClass = "bg-emerald-500";
                else if (pin.status === "in-progress" || pin.status === "progress") colorClass = "bg-primary";
                else if (pin.status === "critical") colorClass = "bg-rose-500";

                return (
                  <button
                    key={pin._id}
                    onClick={() => setSelectedMapIssue(pin)}
                    style={{ left: pin.x, top: pin.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none p-1"
                  >
                    <span className={`absolute inline-flex h-6 w-6 animate-ping rounded-full opacity-65 ${isSelected ? "bg-accent/30" : "bg-zinc-400/20"}`} />
                    <span className={`relative block h-3 w-3 rounded-full border border-white shadow ${colorClass} transition-transform group-hover:scale-125 ${isSelected ? "scale-125 ring-2 ring-primary/20" : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Pin Side panel */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">Selected Pin Details</h3>
            
            <AnimatePresence mode="wait">
              {selectedMapIssue ? (
                <motion.div
                  key={selectedMapIssue._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 py-4 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        {selectedMapIssue.department || "General"}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusColors[selectedMapIssue.status] || statusColors.pending}`}>
                        {selectedMapIssue.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 line-clamp-2">{selectedMapIssue.title}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-4 leading-relaxed">{selectedMapIssue.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-zinc-100">
                    <div className="flex flex-col gap-1.5 text-[10px] font-semibold text-zinc-400">
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {selectedMapIssue.location || "Coordinates Locked"}</span>
                      <span className="flex items-center gap-1.5"><ThumbsUp className="h-3.5 w-3.5" /> {selectedMapIssue.votes} community votes</span>
                    </div>

                    <Link
                      to={`/issues/${selectedMapIssue._id}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-2 px-4 text-xs font-semibold text-white hover:bg-zinc-800 transition-all"
                    >
                      Inspect Full Ticket <ArrowRight className="h-4 w-4" />
                    </Link>
                    {(user && selectedMapIssue.reporter && (typeof selectedMapIssue.reporter === "object" ? ((selectedMapIssue.reporter as any)._id === user.id || (selectedMapIssue.reporter as any)._id === (user as any)._id) : (selectedMapIssue.reporter === user.id || selectedMapIssue.reporter === (user as any)._id)) || user?.role === "admin") && (
                      <button
                        onClick={() => handleDelete(selectedMapIssue._id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 px-4 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all focus:outline-none focus:ring-2 focus:ring-rose-200"
                      >
                        <Trash2 className="h-4 w-4" /> Delete Complaint
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                  <MapPin className="h-8 w-8 text-zinc-300 mb-2" />
                  <p className="text-xs text-zinc-400">Select map pins to inspect.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Listing Columns */}
        <div className="grid gap-6 lg:grid-cols-5">
          
          {/* Trending public complaints (2 columns equivalent) */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" /> Trending Public Issues
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Issues currently backed by the highest community upvote weight.</p>
            </div>

            <div className="divide-y divide-zinc-100 flex-1 mt-4">
              {trendingIssues.map((issue) => (
                <div key={issue._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 max-w-[70%]">
                    <Link to={`/issues/${issue._id}`} className="font-bold text-zinc-800 hover:text-primary transition-colors block truncate">
                      {issue.title}
                    </Link>
                    <span className="text-[10px] text-zinc-400 block truncate">{issue.location}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-zinc-600 flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-zinc-400" /> {issue.votes}
                    </span>
                    <Link to={`/issues/${issue._id}`} className="rounded bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700 hover:bg-zinc-200">
                      View
                    </Link>
                  </div>
                </div>
              ))}
              {trendingIssues.length === 0 && (
                <div className="text-center py-10 text-xs text-zinc-400">No issues found.</div>
              )}
            </div>
          </div>

          {/* Recent complaints (3 columns equivalent) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Recent Community Submissions</h3>
              <Link to="/issues" className="text-xs font-semibold text-primary hover:underline">View All Directory &rarr;</Link>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((s) => (
                  <div key={s} className="h-[260px] rounded-xl border border-zinc-200 bg-white animate-pulse" />
                ))}
              </div>
            ) : recentIssues.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentIssues.slice(0, 2).map((issue) => (
                  <IssueCard key={issue._id} issue={issue} onDelete={(id) => handleDelete(id)} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-xs text-zinc-400 shadow-sm">
                No issues registered.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
