import { useEffect, useState, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import SEO from "@/components/SEO";
import { Search, Grid, List, RotateCcw, ChevronLeft, ChevronRight, SlidersHorizontal, Loader2 } from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";
import { DEPARTMENTS } from "@/constants/departments";

const statuses = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "critical", label: "Critical" },
];

const sortOptions = [
  { value: "votes-desc", label: "Highest Votes" },
  { value: "votes-asc", label: "Lowest Votes" },
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
];

// Memoized Pagination component
const PaginationControls = memo(({
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
    <nav aria-label="Issues pagination" className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 pt-6">
      <span className="text-xs text-zinc-500 font-semibold leading-normal">
        Showing <span className="font-bold text-zinc-800">{startIdx}</span> to <span className="font-bold text-zinc-800">{endIdx}</span> of <span className="font-bold text-zinc-800">{totalCount}</span> reports
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600" />
        </button>
        
        {Array.from({ length: totalPages }).map((_, idx) => {
          const pNum = idx + 1;
          const isSelected = currentPage === pNum;
          return (
            <button
              key={pNum}
              onClick={() => onPageChange(pNum)}
              aria-current={isSelected ? "page" : undefined}
              aria-label={`Page ${pNum}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
                isSelected ? "bg-zinc-900 border-zinc-900 text-white shadow" : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
              }`}
            >
              {pNum}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
          aria-label="Next Page"
        >
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </button>
      </div>
    </nav>
  );
});
PaginationControls.displayName = "PaginationControls";

const Issues = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isListView, setIsListView] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("votes-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // 1. REDIRECT AUTHORITIES FROM CITIZEN DIRECTORY
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
        setIssues(toIssueArray(data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter & Sort logic (Memoized)
  const filteredAndSorted = useMemo(() => {
    let result = [...issues];

    if (dept) {
      result = result.filter((i) => i.department === dept);
    }

    if (status) {
      result = result.filter((i) => i.status === status);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || (i.location && i.location.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sort === "votes-desc") return b.votes - a.votes;
      if (sort === "votes-asc") return a.votes - b.votes;
      if (sort === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

    return result;
  }, [issues, dept, status, search, sort]);

  // Page Slicing
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dept, status, search, sort]);

  const resetFilters = () => {
    setSearch("");
    setDept("");
    setStatus("");
    setSort("votes-desc");
    setCurrentPage(1);
  };

  const directoryStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Civic Issues in Puducherry | CivicChain",
    "description": "Public directory of civic, municipal, and infrastructure complaints in Puducherry.",
    "url": "https://civic-chain-tau.vercel.app/issues",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": paginatedIssues.slice(0, 10).map((issue, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "url": `https://civic-chain-tau.vercel.app/issues/${issue._id}`,
        "name": issue.title
      }))
    }
  }), [paginatedIssues]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <SEO
        title="Civic Issues | CivicChain"
        description="Review active municipal tickets, road repairs, sanitation complaints, and public safety issues in Puducherry. Search by category and upvote community priorities."
        canonicalUrl="https://civic-chain-tau.vercel.app/issues"
        structuredData={directoryStructuredData}
        keywords={[
          "CivicChain",
          "Puducherry civic issues directory",
          "Pondicherry municipal complaints",
          "road damage Pondicherry",
          "water supply issues Puducherry",
          "electricity complaint Puducherry"
        ]}
      />

      <Navbar />

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header Title block */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">Issues Directory</h1>
            <p className="text-sm text-zinc-500 mt-1">Review active municipal tickets, search categories, or check status pipelines.</p>
          </div>
          
          {/* Grid/List layout toggle controllers */}
          <div className="flex items-center gap-1 bg-zinc-200/50 p-1 rounded-lg border border-zinc-200">
            <button
              onClick={() => setIsListView(false)}
              className={`rounded-md p-1.5 transition-all focus:outline-none ${!isListView ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
              aria-label="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsListView(true)}
              className={`rounded-md p-1.5 transition-all focus:outline-none ${isListView ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Filter controls panel grid */}
        <section aria-label="Issue Filter Controls" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 border-b border-zinc-150 pb-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-400" /> Filter Controls
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues..."
                aria-label="Search civic issues"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              />
            </div>

            {/* Department Filter select */}
            <div>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                aria-label="Filter by department"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs text-zinc-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter select */}
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs text-zinc-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                {statuses.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter select */}
            <div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort issues"
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 px-3 text-xs text-zinc-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div>
              <button
                onClick={resetFilters}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </button>
            </div>
          </div>
        </section>

        {/* Directory Output Grid / List container */}
        <section aria-label="Issues List">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>
          ) : filteredAndSorted.length > 0 ? (
            <div className="space-y-6">
              <div className={isListView ? "space-y-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
                {paginatedIssues.map((issue) => (
                  <IssueCard
                    key={issue._id}
                    issue={issue}
                    isListView={isListView}
                    onDelete={(id) => setIssues((prev) => prev.filter((item) => item._id !== id))}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              <PaginationControls
                totalCount={filteredAndSorted.length}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center shadow-sm">
              <p className="text-sm font-semibold text-zinc-400">No issues registered matching these filters.</p>
              <button onClick={resetFilters} className="mt-3 text-xs font-bold text-primary hover:underline">Clear search parameters</button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default Issues;
