import { useEffect, useState, useMemo } from "react";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Sliders,
  RotateCcw,
  LayoutGrid,
  List,
  Shield,
  FileText
} from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

const AuthorityIssues = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isListView, setIsListView] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("date-desc");

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await issuesAPI.getAll();
      const raw = toIssueArray(res.data);
      // Backend automatically isolates by department for authority, but ensure local filter
      if (user?.department) {
        setIssues(raw.filter((i) => i.department === user.department));
      } else {
        setIssues(raw);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIssues();
  }, [user]);

  const filteredAndSorted = useMemo(() => {
    return issues
      .filter((i) => {
        if (status && i.status !== status) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            (i.location && i.location.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "votes-desc") return b.votes - a.votes;
        if (sort === "votes-asc") return a.votes - b.votes;
        if (sort === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return 0;
      });
  }, [issues, search, status, sort]);

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setSort("date-desc");
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <SEO
        title="Department Issues | CivicChain"
        description="Department municipal complaint directory and filter console."
        noIndex={true}
      />
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FileText className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                Department Complaint Directory
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Showing tickets belonging exclusively to <strong className="text-zinc-800">{user?.department || "General"}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono">
              {user?.department} Queue ({filteredAndSorted.length})
            </span>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
              <Sliders className="h-4 w-4 text-zinc-400" /> Filter & Sort Directory
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-primary transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
                <button
                  onClick={() => setIsListView(false)}
                  className={`p-1.5 rounded-md text-xs transition-colors ${!isListView ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsListView(true)}
                  className={`p-1.5 rounded-md text-xs transition-colors ${isListView ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket title or address..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              />
            </div>

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
                <option value="critical">Critical Priority</option>
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
                <option value="votes-desc">Highest Upvotes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center space-y-3">
            <Shield className="h-10 w-10 text-zinc-300 mx-auto" />
            <h3 className="text-base font-bold text-zinc-800">No Tickets Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              There are currently no active complaints matching your search parameters in the {user?.department} directory.
            </p>
          </div>
        ) : (
          <div className={isListView ? "space-y-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
            {filteredAndSorted.map((issue) => (
              <IssueCard key={issue._id} issue={issue} isListView={isListView} onDelete={() => fetchIssues()} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthorityIssues;
