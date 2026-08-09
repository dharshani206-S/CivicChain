import { useEffect, useState, useMemo } from "react";
import { issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import HeatMap from "@/components/HeatMap";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Shield, Activity } from "lucide-react";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

const AuthorityHeatMap = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapIssue, setSelectedMapIssue] = useState<Issue | null>(null);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await issuesAPI.getAll();
      const arr = toIssueArray(res.data);
      setIssues(arr);
      if (arr.length > 0) {
        setSelectedMapIssue(arr[0]);
      }
    } catch (err) {
      console.error("Failed to load map issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIssues();
  }, []);

  // Department-restricted issues list
  const departmentIssues = useMemo(() => {
    if (user?.role === "authority" && user.department) {
      return issues.filter((i) => i.department === user.department);
    }
    return issues;
  }, [issues, user]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
              <MapPin className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">
                Department Incident Heat Map
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Real-time incident density map locked exclusively to <strong className="text-zinc-800">{user?.department || "General"}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-rose-500/10 text-rose-700 border border-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono">
              {user?.department} Pins ({departmentIssues.length})
            </span>
          </div>
        </div>

        {/* Heatmap Card Bounding Frame */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-rose-500" />
              <h3 className="text-sm font-bold text-zinc-900">Live Geo-Density Layer</h3>
            </div>

            {/* Heat Gradient Legend */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Low
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Medium
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span> High Density
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[360px] sm:h-[480px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <HeatMap
              issues={departmentIssues}
              selectedIssue={selectedMapIssue}
              onSelectIssue={(issue) => setSelectedMapIssue(issue)}
              departmentLock={user?.role === "authority" ? user.department : null}
              className="h-[360px] sm:h-[480px] w-full rounded-lg"
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default AuthorityHeatMap;
