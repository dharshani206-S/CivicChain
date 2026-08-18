import { useEffect, useState, useMemo, memo } from "react";
import HeatMap from "@/components/HeatMap";
import { useParams, Link, useNavigate } from "react-router-dom";
import { issuesAPI, getUploadUrl } from "@/services/api";
import Navbar from "@/components/Navbar";
import VoteButton from "@/components/VoteButton";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/utils/api";
import {
  MapPin,
  Calendar,
  Share2,
  Link as LinkIcon,
  ZoomIn,
  X,
  AlertTriangle,
  ArrowLeft,
  User,
  Shield,
  Trash2,
  Camera,
  Activity
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
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="space-y-4">
      <div className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-slate-900 aspect-square shadow-sm">
        {imageUrl && !imgError ? (
          <>
            <img
              src={imageUrl}
              alt={`Photo of civic complaint: ${title}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
            <button
              onClick={onZoom}
              className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/80 backdrop-blur-[1px] text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
              aria-label="Zoom Image"
            >
              <ZoomIn className="h-4.5 w-4.5" />
            </button>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900 text-slate-400 p-4 text-center select-none font-mono">
            <Camera className="h-8 w-8 stroke-[1.5] text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Image Unavailable</span>
          </div>
        )}
      </div>
      
      {imageUrl && !imgError && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[10px] font-semibold text-zinc-400 flex items-center justify-between">
          <span>Image attachments (1)</span>
          <button onClick={onZoom} className="text-primary hover:underline flex items-center gap-1">
            Expand view &rarr;
          </button>
        </div>
      )}
    </div>
  );
});
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
  <header className="space-y-3">
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
  </header>
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
    <section aria-label="Audit Progress Timeline" className="space-y-4">
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
    </section>
  );
});
TimelineSection.displayName = "TimelineSection";

const IssueHeatMapSection = memo(({
  issue
}: {
  issue: import("@/types/issue").Issue;
}) => {
  const hasCoords =
    issue.latitude !== undefined &&
    issue.latitude !== null &&
    issue.latitude !== "" &&
    issue.longitude !== undefined &&
    issue.longitude !== null &&
    issue.longitude !== "";

  return (
    <section aria-label="Issue Location Heat Map" className="space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-rose-500" />
          Issue Location Heat Map
        </h3>
        {hasCoords && (
          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded">
            {parseFloat(String(issue.latitude)).toFixed(5)}, {parseFloat(String(issue.longitude)).toFixed(5)}
          </span>
        )}
      </div>

      {hasCoords ? (
        <HeatMap
          issues={[issue]}
          singleIssueMode={true}
          className="h-[220px] w-full rounded-lg"
        />
      ) : (
        <div className="flex h-[160px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50/50">
          <div className="text-center space-y-1">
            <MapPin className="h-6 w-6 text-zinc-300 mx-auto" />
            <p className="text-xs text-zinc-400 font-mono">GPS coordinates unavailable</p>
          </div>
        </div>
      )}
    </section>
  );
});
IssueHeatMapSection.displayName = "IssueHeatMapSection";

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

  const imageUrl = issue ? getUploadUrl(issue.image, { width: 1000, height: 750 }) : null;
  const departmentLabel = issue?.department || "General";
  
  // Dynamic Priority calculation based on votes
  const getPriority = (votes: number) => {
    if (votes >= 50) return { label: "Critical", style: "bg-rose-100 text-rose-700 border-rose-200" };
    if (votes >= 20) return { label: "High", style: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "Normal", style: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  };

  const priority = getPriority(issue ? issue.votes : 0);

  const issueStructuredData = useMemo(() => {
    if (!issue) return undefined;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Report",
          "@id": `https://civic-chain-tau.vercel.app/issues/${issue._id}#report`,
          "headline": issue.title,
          "description": issue.description,
          "datePublished": issue.createdAt,
          "image": imageUrl || "https://civic-chain-tau.vercel.app/hero-bg.jpg",
          "author": {
            "@type": "Organization",
            "name": "CivicChain Community Reporter"
          },
          "publisher": {
            "@type": "Organization",
            "name": "CivicChain",
            "url": "https://civic-chain-tau.vercel.app"
          },
          "spatialCoverage": {
            "@type": "Place",
            "name": issue.location || "Puducherry, India",
            "geo": issue.latitude && issue.longitude ? {
              "@type": "GeoCoordinates",
              "latitude": parseFloat(String(issue.latitude)),
              "longitude": parseFloat(String(issue.longitude))
            } : undefined
          }
        },
        {
          "@type": "BreadcrumbList",
          "@id": `https://civic-chain-tau.vercel.app/issues/${issue._id}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://civic-chain-tau.vercel.app"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Issues Directory",
              "item": "https://civic-chain-tau.vercel.app/issues"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": issue.title,
              "item": `https://civic-chain-tau.vercel.app/issues/${issue._id}`
            }
          ]
        }
      ]
    };
  }, [issue, imageUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <SEO
          title="Loading Civic Incident... | CivicChain"
          description="Loading civic issue details on CivicChain Puducherry."
        />
        <Navbar />
        <div className="flex justify-center py-24">
          <IssueLoader />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <SEO
          title="Ticket Not Found | CivicChain"
          description="The requested civic incident ticket does not exist or has been archived."
          noIndex={true}
        />
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-950">Ticket Not Found</h2>
          <p className="text-xs text-zinc-500">The requested ticket ID does not exist or has been archived.</p>
          <Link to="/issues" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>
        </main>
      </div>
    );
  }

  const seoDescription = issue.description.length > 155
    ? `${issue.description.slice(0, 152)}...`
    : issue.description;

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <SEO
        title={`${issue.title} | CivicChain Puducherry`}
        description={seoDescription}
        canonicalUrl={`https://civic-chain-tau.vercel.app/issues/${issue._id}`}
        ogType="article"
        ogImage={imageUrl || "/hero-bg.jpg"}
        ogImageAlt={`Civic issue: ${issue.title}`}
        structuredData={issueStructuredData}
        keywords={[
          issue.title,
          departmentLabel,
          issue.location || "Puducherry",
          "civic issue track",
          "municipal resolution pipeline"
        ]}
      />

      <Navbar />

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <Link to="/issues" className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-primary transition-colors focus:outline-none focus:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Directory
          </Link>
          <span className="text-[10px] font-mono text-zinc-400 select-none">TICKET ID: {issue._id}</span>
        </nav>

        {/* Layout: Left Column (Image) | Right Column (Details) */}
        <article className="grid gap-8 md:grid-cols-12 items-stretch">
          
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

        </article>

        {/* Timeline & Mapping Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Timeline Box */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
            <TimelineSection createdAt={issue.createdAt} department={departmentLabel} status={issue.status} />
          </div>

          {/* Location Heat Map Box */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
            <IssueHeatMapSection issue={issue} />
          </div>
        </div>

      </main>

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

const IssueLoader = memo(() => (
  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
));
IssueLoader.displayName = "IssueLoader";

export default IssueDetails;
