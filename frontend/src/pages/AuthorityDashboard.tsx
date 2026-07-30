import { useEffect, useState, useMemo, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUploadUrl, issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
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
    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
      {cards.map((c, idx) => {
        const CardIcon = c.icon;
        return (
          <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2 hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{c.label}</span>
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
  const [selectedMapIssue, setSelectedMapIssue] = useState<Issue | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
        if (arr.length > 0 && !selectedMapIssue) {
          setSelectedMapIssue(arr[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIssues();
  }, []);

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
    const total = issues.length;
    const pending = issues.filter((i) => i.status === "pending").length;
    const inProgress = issues.filter((i) => i.status === "in-progress" || i.status === "progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    const critical = issues.filter((i) => i.votes >= 50).length;

    return { total, pending, inProgress, resolved, critical };
  }, [issues]);

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

  // Map coordinates plotter
  const mapIssuePins = useMemo(() => {
    return issues.map((issue) => {
      const numId = issue._id.replace(/\D/g, "");
      const seedX = numId ? parseInt(numId.slice(-2)) || 50 : 50;
      const seedY = numId ? parseInt(numId.slice(-4, -2)) || 50 : 50;

      const x = 15 + (seedX % 70) + "%";
      const y = 15 + (seedY % 70) + "%";
      return { ...issue, x, y };
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
                {user?.role === "admin" ? "Admin Command Center" : `${user?.department} Operations`}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {user?.role === "admin" 
                  ? "Global systems administration dashboard. Manage all departments queue queues."
                  : `Locked department portal. Monitor and resolve ${user?.department} tickets.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <AdminStatsRow
          total={stats.total}
          pending={stats.pending}
          inProgress={stats.inProgress}
          resolved={stats.resolved}
          critical={stats.critical}
        />

        {/* Map & Alerts Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          
          {/* Geotagged Map */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between min-h-[360px] hover:border-zinc-300 transition-colors">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Incident Geotagging Map</h3>
              <p className="text-xs text-zinc-500 mt-0.5 font-sans">Pins show active problem areas colored by status.</p>
            </div>

            <div className="relative aspect-video w-full rounded-lg border border-zinc-150 bg-zinc-50 overflow-hidden mt-4">
              <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0,30 L 1000,400 M 50,0 L 150,500 M 350,0 L 400,500 M 0,200 L 1000,180" stroke="#000" strokeWidth="2" fill="none" />
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
                    className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none p-1"
                  >
                    <span className={`absolute inline-flex h-6 w-6 animate-ping rounded-full opacity-65 ${isSelected ? "bg-rose-500/20" : "bg-zinc-400/10"}`} />
                    <span className={`relative block h-3 w-3 rounded-full border border-white shadow ${colorClass} transition-transform ${isSelected ? "scale-125 ring-2 ring-primary/15" : ""}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Bell className="h-4.5 w-4.5 text-zinc-400 animate-pulse" />
              <h3 className="text-sm font-bold text-zinc-900">Operations Feed</h3>
            </div>
            
            <div className="divide-y divide-zinc-100 flex-1 overflow-y-auto max-h-[300px] mt-2 pr-1">
              {alerts.map((a) => (
                <div key={a.id} className="py-3.5 space-y-1">
                  <div className="flex justify-between items-center gap-4 text-[9px] font-bold text-zinc-400 font-mono">
                    <span className="uppercase">ALERT COMPILATION</span>
                    <span>{a.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-800 line-clamp-1">{a.title}</h4>
                  <p className="text-[10px] text-zinc-500 leading-normal">{a.desc}</p>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-16 text-xs text-zinc-400 font-mono">All logs checked. Feed empty.</div>
              )}
            </div>
          </div>

        </div>

        {/* Issue Management Operations Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden space-y-4 p-5 hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
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
                  const imageUrl = getUploadUrl(issue.image);
                  return (
                    <tr key={issue._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-md border border-zinc-150 overflow-hidden bg-zinc-50">
                            {imageUrl ? (
                              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
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
