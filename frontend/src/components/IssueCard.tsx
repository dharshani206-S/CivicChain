import { Link, useNavigate } from "react-router-dom";
import VoteButton from "./VoteButton";
import { MapPin, Calendar, ShieldAlert, Sparkles, CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { getUploadUrl, issuesAPI } from "@/services/api";
import type { Issue } from "@/types/issue";
import { memo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/utils/api";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  critical: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

interface IssueCardProps {
  issue: Issue;
  isListView?: boolean;
  onDelete?: (id: string) => void;
}

const IssueCard = memo(({ issue, isListView = false, onDelete }: IssueCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isOwner = user && issue.reporter && (
    typeof issue.reporter === "object"
      ? ((issue.reporter as any)._id === user.id || (issue.reporter as any)._id === (user as any)._id)
      : (issue.reporter === user.id || issue.reporter === (user as any)._id)
  );
  const isAdmin = user?.role === "admin";
  const canDelete = isOwner || isAdmin;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this complaint?")) return;
    try {
      await issuesAPI.delete(issue._id);
      toast.success("Complaint deleted successfully");
      if (onDelete) {
        onDelete(issue._id);
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete complaint"));
    }
  };

  const imageUrl = getUploadUrl(issue.image);
  const departmentLabel = issue.department || "General";
  
  // Dynamic Priority calculation based on votes
  const getPriority = (votes: number) => {
    if (votes >= 50) return { label: "Critical", style: "bg-rose-100 text-rose-700 border-rose-200" };
    if (votes >= 20) return { label: "High", style: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Normal", style: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  };

  const priority = getPriority(issue.votes);

  // Dynamic AI Confidence calculation (simulated on-the-fly for presentation)
  const getAIConfidence = (id: string) => {
    const numericId = id.replace(/\D/g, "");
    const seed = numericId ? parseInt(numericId.slice(-2)) || 95 : 95;
    const confidence = 85 + (seed % 14); // yields 85% to 99%
    return `${confidence}% Match`;
  };

  const aiConfidence = getAIConfidence(issue._id);

  if (isListView) {
    return (
      <div className="group flex flex-col sm:flex-row gap-4 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-md transition-all">
        {/* Image viewport */}
        <div className="relative aspect-video sm:w-48 w-full shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
          {imageUrl ? (
            <img src={imageUrl} alt={issue.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 font-semibold uppercase">No Image</div>
          )}
          <span className={`absolute right-2 top-2 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[issue.status] || statusColors.pending}`}>
            {issue.status}
          </span>
        </div>

        {/* Text descriptions */}
        <div className="flex flex-1 flex-col justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {departmentLabel}
              </span>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priority.style}`}>
                {priority.label} Priority
              </span>
            </div>
            
            <Link to={`/issues/${issue._id}`} className="block text-base font-bold text-zinc-950 hover:text-primary transition-colors focus:outline-none focus:underline mt-1">
              {issue.title}
            </Link>
            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{issue.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-3">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold text-zinc-400">
              {issue.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {issue.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <VoteButton issueId={issue._id} votes={issue.votes} votedBy={issue.votedBy} />
              <Link
                to={`/issues/${issue._id}`}
                className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                View Details
              </Link>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                  aria-label="Delete ticket"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all overflow-hidden">
      {/* Image Block */}
      <div className="relative aspect-video w-full overflow-hidden border-b border-zinc-100 bg-zinc-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={issue.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 font-semibold uppercase">No Image</div>
        )}
        <span className={`absolute right-3 top-3 rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[issue.status] || statusColors.pending}`}>
          {issue.status}
        </span>
      </div>

      {/* Main Details */}
      <div className="p-5 flex flex-col justify-between flex-1 gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {departmentLabel}
            </span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priority.style}`}>
              {priority.label}
            </span>
          </div>

          <div>
            <Link to={`/issues/${issue._id}`} className="block text-base font-bold text-zinc-950 hover:text-primary transition-colors focus:outline-none focus:underline line-clamp-1">
              {issue.title}
            </Link>
            <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed">{issue.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5 text-[10px] font-semibold text-zinc-400 border-t border-zinc-100 pt-3.5">
            {issue.location && (
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {issue.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <VoteButton issueId={issue._id} votes={issue.votes} votedBy={issue.votedBy} />
            <div className="flex items-center gap-1.5">
              <Link
                to={`/issues/${issue._id}`}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2"
              >
                View Details
              </Link>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                  aria-label="Delete ticket"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IssueCard.displayName = "IssueCard";

export default IssueCard;
