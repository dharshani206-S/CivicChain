import { useEffect, useState, memo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getUploadUrl, issuesAPI } from "@/services/api";
import Navbar from "@/components/Navbar";
import VoteButton from "@/components/VoteButton";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/utils/api";
import {
  MapPin,
  Calendar,
  Tag,
  Share2,
  Link as LinkIcon,
  ZoomIn,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  User,
  Shield,
  Layers,
  Trash2
} from "lucide-react";
import type { Issue } from "@/types/issue";
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

const ImageColumn = memo(({
  imageUrl,
  title,
  onZoom
}: {
  imageUrl: string | null;
  title: string;
  onZoom: () => void;
}) => (
  <div className="space-y-4">
    <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-white aspect-square shadow-sm">
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          <button
            onClick={onZoom}
            className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/80 backdrop-blur-[1px] text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
            aria-label="Zoom Image"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 font-semibold uppercase font-mono">
          No Image Available
        </div>
      )}
    </div>
    
    {imageUrl && (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[10px] font-semibold text-zinc-400 flex items-center justify-between">
        <span>Image attachments (1)</span>
        <button onClick={onZoom} className="text-primary hover:underline flex items-center gap-1">
          Expand view &rarr;
        </button>
      </div>
    )}
  </div>
));
ImageColumn.displayName = "ImageColumn";

const DetailsHeader = memo(({
  title,
  status,
  department,
  priorityLabel,
  priorityStyle
}: {
  title: string;
  status: string;
  department: string;
  priorityLabel: string;
  priorityStyle: string;
}) => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[status] || statusColors.pending}`}>
        {status}
      </span>
      <span className="rounded bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        {department}
      </span>
      <span className={`rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityStyle}`}>
        {priorityLabel} Priority
      </span>
    </div>

    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 leading-tight">
      {title}
    </h1>
  </div>
));
DetailsHeader.displayName = "DetailsHeader";

const TimelineSection = memo(({
  createdAt,
  department,
  status
}: {
  createdAt: string;
  department: string;
  status: string;
}) => {
  const steps = [
    {
      label: "Ticket Lodged",
      done: true,
      time: new Date(createdAt).toLocaleString(),
      notes: "Parameters verified and logged in city records pipeline."
    },
    {
      label: "Department Routed",
      done: true,
      time: new Date(createdAt).toLocaleDateString(),
      notes: `Assigned to ${department} routing queue.`
    },
    {
      label: "Inspector Auditing",
      done: status === "in-progress" || status === "resolved",
      time: status === "in-progress" || status === "resolved" ? "Updated recently" : null,
      notes: status === "in-progress" || status === "resolved" ? "Dispatch units scheduled for field assessment." : null
    },
    {
      label: "Resolution Lodged",
      done: status === "resolved",
      time: status === "resolved" ? "Completed" : null,
      notes: status === "resolved" ? "Maintenance team resolved outage. Ticket closed." : null
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-150 pb-2">Audit Progress Timeline</h3>
      
      <div className="relative pl-5 border-l-2 border-zinc-200 space-y-6">
        {steps.map((s, idx) => {
          const isActive = s.done;
          return (
            <div key={idx} className="relative">
              <span className={`absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full border border-white ${
                isActive ? "bg-primary ring-4 ring-primary/10" : "bg-zinc-200"
              }`} />
              
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className={`text-xs font-bold ${isActive ? "text-zinc-950" : "text-zinc-400"}`}>
                    {s.label}
                  </h4>
                  {s.time && <span className="text-[9px] font-semibold text-zinc-400">{s.time}</span>}
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  {s.notes || "Timeline log pending dispatcher updates."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
TimelineSection.displayName = "TimelineSection";

const MapSection = memo(({
  location,
  latitude,
  longitude
}: {
  location: string;
  latitude?: string;
  longitude?: string;
}) => {
  const hasCoords = latitude && longitude;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-150 pb-2">Location Coordinates Mapping</h3>
      
      {hasCoords ? (
        <div className="relative aspect-video w-full rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-inner" aria-label="Location coordinate mapping pinpoint">
          <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 0,30 L 800,450 M 100,0 L 200,500 M 400,0 L 450,500 M 0,220 L 800,200" stroke="#000" strokeWidth="2" fill="none" />
          </svg>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-rose-500/20 opacity-75" />
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow shadow-rose-500/30">
              <MapPin className="h-4 w-4" />
            </div>
          </div>

          <div className="absolute bottom-2.5 left-2.5 rounded bg-white border border-zinc-200 px-2 py-0.5 text-[9px] font-semibold text-zinc-500 font-mono">
            Lat/Lon: {latitude}, {longitude}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 text-center text-xs text-zinc-400 font-mono">
          Location coordinates unavailable for this ticket.
        </div>
      )}
    </div>
  );
});
MapSection.displayName = "MapSection";

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this complaint?")) return;
    try {
      if (issue) {
        await issuesAPI.delete(issue._id);
        toast.success("Complaint deleted successfully");
        navigate("/issues");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete complaint"));
    }
  };

  useEffect(() => {
    if (id) {
      issuesAPI
        .getById(id)
        .then((res) => setIssue(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Ticket tracking link copied!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: issue?.title || "CivicChain Ticket",
          text: `Track this Smart City issue: ${issue?.title}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />
        <div className="flex justify-center py-24">
          <Loader2 />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-950">Ticket Not Found</h2>
          <p className="text-xs text-zinc-500">The requested ticket ID does not exist or has been archived.</p>
          <Link to="/issues" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = getUploadUrl(issue.image);
  const departmentLabel = issue.department || "General";
  
  // Dynamic Priority calculation based on votes
  const getPriority = (votes: number) => {
    if (votes >= 50) return { label: "Critical", style: "bg-rose-100 text-rose-700 border-rose-200" };
    if (votes >= 20) return { label: "High", style: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Normal", style: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  };

  const priority = getPriority(issue.votes);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <Link to="/issues" className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-primary transition-colors focus:outline-none focus:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Directory
          </Link>
          <span className="text-[10px] font-mono text-zinc-400 select-none">TICKET ID: {issue._id}</span>
        </div>

        {/* Layout: Left Column (Image) | Right Column (Details) */}
        <div className="grid gap-8 md:grid-cols-12 items-stretch">
          
          {/* Left Column (Image) */}
          <div className="md:col-span-5">
            <ImageColumn imageUrl={imageUrl} title={issue.title} onZoom={() => setZoomOpen(true)} />
          </div>

          {/* Right Column (Details & Actions) */}
          <div className="md:col-span-7 flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="space-y-6">
              <DetailsHeader
                title={issue.title}
                status={issue.status}
                department={departmentLabel}
                priorityLabel={priority.label}
                priorityStyle={priority.style}
              />

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Description</span>
                <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>

              {/* General Metadata Info Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-100">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location Area
                  </span>
                  <p className="text-xs font-bold text-zinc-800">{issue.location || "Unavailable"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Reported Date
                  </span>
                  <p className="text-xs font-bold text-zinc-800">{new Date(issue.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" /> Reporter Profile
                  </span>
                  <p className="text-xs font-bold text-zinc-800">Anonymous Citizen</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Audited Dispatcher
                  </span>
                  <p className="text-xs font-bold text-zinc-800">City Operator Assigned</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 mt-6 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <VoteButton issueId={issue._id} votes={issue.votes} votedBy={issue.votedBy} />
              </div>

              <div className="flex items-center gap-2">
                {(user && issue.reporter && (typeof issue.reporter === "object" ? ((issue.reporter as any)._id === user.id || (issue.reporter as any)._id === (user as any)._id) : (issue.reporter === user.id || issue.reporter === (user as any)._id)) || user?.role === "admin") && (
                  <button
                    onClick={handleDelete}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-200"
                    aria-label="Delete Complaint"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  aria-label="Share Ticket"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  aria-label="Copy Tracking Link"
                >
                  <LinkIcon className="h-4 w-4" /> Copy Link
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Timeline & Mapping Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Timeline Box */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
            <TimelineSection createdAt={issue.createdAt} department={departmentLabel} status={issue.status} />
          </div>

          {/* Location Map Box */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
            <MapSection location={issue.location} latitude={issue.latitude} longitude={issue.longitude} />
          </div>
        </div>

      </div>

      {/* Expanded Zoom Lightbox Modal */}
      <AnimatePresence>
        {zoomOpen && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-[2px]"
          >
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute right-4 top-4 rounded-lg bg-zinc-900 text-white p-2 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close Zoom"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-h-[90vh] max-w-[90vw] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900"
            >
              <img src={imageUrl} alt={issue.title} className="max-h-[80vh] w-auto object-contain mx-auto" />
              <div className="bg-zinc-950 p-4 text-center text-xs font-semibold text-zinc-300 border-t border-zinc-800 select-none">
                {issue.title}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Loader2 = memo(() => (
  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
));
Loader2.displayName = "Loader2";

export default IssueDetails;
