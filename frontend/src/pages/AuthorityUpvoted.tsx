import { useEffect, useState, useMemo } from "react";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Shield, ThumbsUp } from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

const AuthorityUpvoted = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await issuesAPI.getAll();
      const arr = toIssueArray(res.data);
      setIssues(arr);
    } catch (err) {
      console.error("Failed to fetch upvoted issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIssues();
  }, []);

  // Department-restricted and sorted by highest votes first
  const upvotedIssues = useMemo(() => {
    let result = [...issues];

    if (user?.role === "authority" && user.department) {
      result = result.filter((i) => i.department === user.department);
    }

    // Sort strictly by votes descending
    result.sort((a, b) => b.votes - a.votes);

    return result;
  }, [issues, user]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <TrendingUp className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                Department Upvoted Issues
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Priority complaints in <strong className="text-zinc-800">{user?.department || "General"}</strong> ranked by citizen backing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono">
              Highest Upvotes First ({upvotedIssues.length})
            </span>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : upvotedIssues.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center space-y-3">
            <ThumbsUp className="h-10 w-10 text-zinc-300 mx-auto" />
            <h3 className="text-base font-bold text-zinc-800">No Upvoted Complaints</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              There are currently no upvoted tickets registered under the {user?.department} department.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {upvotedIssues.map((issue) => (
              <IssueCard key={issue._id} issue={issue} onDelete={() => fetchIssues()} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthorityUpvoted;
