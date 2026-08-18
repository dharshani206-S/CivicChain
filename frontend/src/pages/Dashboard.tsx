import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { issuesAPI } from "@/services/api";
import {
  FileText,
  PlusCircle,
  Sparkles,
  LogIn,
  UserPlus,
  BarChart3
} from "lucide-react";
import Navbar from "@/components/Navbar";
import IssueCard from "@/components/IssueCard";
import SEO from "@/components/SEO";
import type { Issue } from "@/types/issue";
import { toIssueArray, getApiErrorMessage } from "@/utils/api";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Logged-in Citizen's OWN issues
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. REDIRECT AUTHORITIES FROM CITIZEN DASHBOARD
  useEffect(() => {
    if (user?.role === "authority") {
      navigate("/authority", { replace: true });
    }
  }, [user, navigate]);

  const fetchMyData = () => {
    setLoading(true);

    // Fetch ONLY authenticated citizen's own reports if logged in
    const p2 = isAuthenticated
      ? issuesAPI
          .getMyIssues()
          .then((res) => {
            setMyIssues(toIssueArray(res.data));
          })
          .catch((err) => {
            console.error("Failed to load user reports:", err);
          })
      : Promise.resolve();

    Promise.all([p2]).finally(() => setLoading(false));
  };

  useEffect(() => {
    void fetchMyData();
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
    try {
      await issuesAPI.delete(id);
      toast.success("Report deleted successfully");
      setMyIssues((prev) => prev.filter((i) => i._id !== id));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete report"));
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-12 sm:pb-16">
      <SEO
        title="Citizen Hub | CivicChain"
        description="Citizen incident dashboard and complaint overview."
        noIndex={true}
      />
      <Navbar />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
        
        {/* Welcome Section */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">Citizen Control Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 mt-0.5 sm:mt-1">
              {isAuthenticated ? `Welcome Back, ${user?.name}` : "Civic Incident Portal"}
            </h1>
            <p className="text-xs text-zinc-500 leading-normal max-w-xl">
              Monitor your active civic reports, track resolution progress across municipal departments, and log new incidents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
            {isAuthenticated ? (
              <>
                <Link
                  to="/my-stats"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                >
                  <BarChart3 className="h-4 w-4 text-primary" /> View My Stats
                </Link>
                <Link
                  to="/report"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all"
                >
                  <PlusCircle className="h-4 w-4" /> Report New Issue
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login/citizen"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/95 transition-all"
                >
                  <LogIn className="h-4 w-4" /> Sign In to Report
                </Link>
                <Link
                  to="/register"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 transition-all"
                >
                  <UserPlus className="h-4 w-4 text-zinc-400" /> Create Profile
                </Link>
              </>
            )}
          </div>
        </div>


        {/* My Recent Reports Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5 sm:pb-3">
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-950">My Recent Reports</h3>
            <span className="text-xs text-zinc-500 font-semibold font-mono">
              Total Logged: {myIssues.length}
            </span>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="h-64 rounded-xl border border-zinc-200 bg-white animate-pulse" />
              ))}
            </div>
          ) : myIssues.length > 0 ? (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {myIssues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} onDelete={(id) => handleDelete(id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 text-center space-y-3 sm:space-y-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900">No reports yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Report a civic issue in your neighborhood to see your personal reports tracked here.
                </p>
              </div>
              <Link
                to="/report"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary/95 transition-all"
              >
                <PlusCircle className="h-4 w-4" /> Report New Issue
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
