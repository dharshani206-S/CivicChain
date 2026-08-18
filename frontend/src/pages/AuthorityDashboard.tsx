import { useEffect, useState, useMemo, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUploadUrl, issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  MapPin,
  Trash2,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  RotateCcw,
  Bell
} from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray, getApiErrorMessage } from "@/utils/api";
import { DEPARTMENTS } from "@/constants/departments";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  critical: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

// ==========================================
// OPTIMIZED SUB-COMPONENTS
// ==========================================

const AdminStatsRow = memo(({
  total,
  pending,
  inProgress,
  resolved,
  critical
}: {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  critical: number;
}) => {
  const cards = [
    { label: "Total Logs", value: total, icon: FileText, style: "bg-zinc-100 text-zinc-800 border-zinc-200" },
    { label: "Pending", value: pending, icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { label: "In Progress", value: inProgress, icon: Clock, style: "bg-primary/10 text-primary border-primary/20" },
    { label: "Resolved", value: resolved, icon: CheckCircle, style: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { label: "Critical Priority", value: critical, icon: TrendingUp, style: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
      {cards.map((c, idx) => {
        const CardIcon = c.icon;
        return (
          <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2 hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">{c.label}</span>
              <div className={`rounded-md p-1 border ${c.style}`}>
                <CardIcon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-zinc-900 tracking-tight">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
});
AdminStatsRow.displayName = "AdminStatsRow";

const TablePagination = memo(({
  totalCount,
  currentPage,
  itemsPerPage,
  onPageChange
}: {
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-zinc-150 p-4 bg-zinc-50/50">
      <span className="text-xs text-zinc-400 font-semibold font-mono">
        Showing {startIdx}-{endIdx} of {totalCount} records
      </span>
      
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold text-zinc-700 px-2 font-mono">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
TablePagination.displayName = "TablePagination";

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

const AuthorityDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Authority Analytics State
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
    recentComplaints: Issue[];
  } | null>(null);

  // 1. SYNC DEPARTMENT LOCK FROM AUTHORITY CREDENTIALS
  useEffect(() => {
    if (user?.role === "authority" && user.department) {
      setDept(user.department);
    }
  }, [user]);

  const fetchIssues = () => {
    setLoading(true);
    issuesAPI
      .getAll()
      .then((res) => {
        const data: unknown = res.data;
        const arr = toIssueArray(data);
        setIssues(arr);
      })
      .catch(() => {})
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

  // API Call handlers
  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await issuesAPI.updateStatus(id, newStatus);
      toast.success(`Ticket status updated to ${newStatus}`);
      fetchIssues();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update ticket status"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await issuesAPI.delete(id);
      toast.success("Ticket deleted successfully");
      fetchIssues();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete ticket"));
    }
  };

  // Stats calculation (strictly real data)
  const stats = useMemo(() => {
    if (authorityAnalytics?.stats) {
      const { total, pending, inProgress, resolved, critical } = authorityAnalytics.stats;
      return { total, pending, inProgress, resolved, critical };
    }

    const total = issues.length;
    const pending = issues.filter((i) => i.status === "pending").length;
    const inProgress = issues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    const critical = issues.filter((i) => i.votes >= 50 || i.severity === "Critical").length;

    return { total, pending, inProgress, resolved, critical };
  }, [issues, authorityAnalytics]);

  // Notifications Feed (real data logs filter: high votes or new status)
  const alerts = useMemo(() => {
    return issues
      .filter((i) => i.votes >= 20 || i.status === "pending")
      .slice(0, 5)
      .map((i) => {
        const isCritical = i.votes >= 50;
        return {
          id: i._id,
          title: i.title,
          time: new Date(i.createdAt).toLocaleDateString(),
          desc: isCritical
            ? `Critical upvote alert: ${i.votes} citizens backed this.`
            : `New ticket registered in ${i.department || "General"} queue.`
        };
      });
  }, [issues]);

  // Table filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...issues];

    if (dept) result = result.filter((i) => i.department === dept);
    if (status) result = result.filter((i) => i.status === status);
    
    if (priority) {
      if (priority === "critical") result = result.filter((i) => i.votes >= 50);
      else if (priority === "high") result = result.filter((i) => i.votes >= 20 && i.votes < 50);
      else result = result.filter((i) => i.votes < 20);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (i.location && i.location.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sort === "votes-desc") return b.votes - a.votes;
      if (sort === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

    return result;
  }, [issues, dept, status, priority, search, sort]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dept, status, priority, search, sort]);

  const resetFilters = () => {
    setSearch("");
    // Keep locked department if user is authority
    if (user?.role !== "authority") {
      setDept("");
    }
    setStatus("");
    setPriority("");
    setSort("date-desc");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <SEO
        title="Authority Dashboard | CivicChain"
        description="Department Dispatch Command Center and Ticket Management."
        noIndex={true}
      />
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        
        {/* Header Ops Center */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 shadow shadow-rose-500/5">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
                Authority Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs text-zinc-500 font-medium">Officer: <strong className="text-zinc-900">{user?.name || "Department Officer"}</strong></span>
                <span className="text-zinc-300">•</span>
                <span className="rounded bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
                  Department: {user?.department || "General"}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/authority/stats"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            <TrendingUp className="h-4 w-4 text-primary" /> View Department Stats
          </Link>
        </div>


        {/* Issue Management Operations Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden space-y-4 p-5 hover:border-zinc-300 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150 pb-3">
            <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-900">
              <Sliders className="h-4.5 w-4.5 text-zinc-400" /> Dispatch Control Panel
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
            </button>
          </div>

          {/* Table Filters panel */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              />
            </div>

            {/* Department Filter - Only active and visible for Global Admins */}
            {user?.role === "admin" ? (
              <div>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs text-zinc-500 font-semibold">
                Dept: {user?.department} (Locked)
              </div>
            )}

            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical (50+ votes)</option>
                <option value="high">High (20+ votes)</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="votes-desc">Highest Votes</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-zinc-200 rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Incident Log</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Votes</th>
                  <th className="px-4 py-3 text-left">Lodge Date</th>
                  <th className="px-4 py-3 text-left">Status Pipeline</th>
                  <th className="px-4 py-3 text-center">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {paginatedIssues.map((issue) => {
                  const imageUrl = getUploadUrl(issue.image, { width: 120, height: 120 });
                  return (
                    <tr key={issue._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-md border border-zinc-150 overflow-hidden bg-slate-900 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[9px] text-zinc-400 font-bold uppercase font-mono">NA</div>
                            )}
                          </div>
                          <div className="max-w-[200px] sm:max-w-[300px]">
                            <Link to={`/issues/${issue._id}`} className="font-bold text-zinc-950 hover:underline block truncate">
                              {issue.title}
                            </Link>
                            <span className="text-[10px] text-zinc-400 block truncate">{issue.location || "Coordinates Locked"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 font-bold uppercase text-[9px]">
                          {issue.department || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-zinc-600 font-mono">{issue.votes}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono">{new Date(issue.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select
                           value={issue.status}
                           onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
                           className={`rounded border px-2 py-1 text-[10px] font-bold outline-none capitalize ${statusColors[issue.status] || statusColors.pending}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="critical">Critical</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/issues/${issue._id}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800"
                            aria-label="Inspect ticket Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {(user && issue.reporter && (typeof issue.reporter === "object" ? ((issue.reporter as any)._id === user.id || (issue.reporter as any)._id === (user as any)._id) : (issue.reporter === user.id || issue.reporter === (user as any)._id)) || user?.role === "admin") && (
                            <button
                              onClick={() => handleDelete(issue._id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-rose-500 hover:bg-rose-50/50 hover:border-rose-200"
                              aria-label="Delete ticket"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 font-mono">No incident reports match filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            totalCount={filteredAndSorted.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>
    </div>
  );
};

export default AuthorityDashboard;
