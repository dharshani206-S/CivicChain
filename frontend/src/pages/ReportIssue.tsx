import { useEffect, useRef, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { issuesAPI, aiAPI, type GeminiAnalysisResult } from "@/services/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";
import LocationPickerMap from "@/components/LocationPickerMap";
import {
  Loader2,
  Send,
  Camera,
  Brain,
  MapPin,
  FileText,
  Eye,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sliders,
  Sparkles,
  AlertTriangle,
  Navigation
} from "lucide-react";
import { DEPARTMENTS } from "@/constants/departments";
import { getApiErrorMessage } from "@/utils/api";
import { GeolocationError, getCurrentCoordinates, reverseGeocode } from "@/lib/geolocation";
import { isWithinPuducherryUT } from "@/lib/puducherryGeo";
import { motion, AnimatePresence } from "framer-motion";

const toFixed6 = (value: number) => value.toFixed(6);

const buildAutoTitle = (dept: string) => {
  if (!dept) return "Reported issue";
  if (dept.toLowerCase().includes("street")) return "Street light outage / malfunction";
  if (dept.toLowerCase().includes("water")) return "Water supply leak / pipeline damage";
  if (dept.toLowerCase().includes("sanit")) return "Sanitation cleaning / garbage overflow";
  if (dept.toLowerCase().includes("road")) return "Pothole / Road infrastructure damage";
  return `${dept} issue`;
};

const buildAutoDescription = (params: {
  dept?: string | null;
  locationText?: string | null;
  latitude?: string | null;
  longitude?: string | null;
}) => {
  const dept = params.dept?.trim();
  const locationText = params.locationText?.trim();
  const lat = params.latitude?.trim();
  const lon = params.longitude?.trim();

  const parts: string[] = [];
  parts.push(`Auto-detected a ${dept || "municipal"} issue from the uploaded photo.`);
  if (locationText) parts.push(`Location: ${locationText}.`);
  else if (lat && lon) parts.push(`Coordinates: ${lat}, ${lon}.`);
  parts.push("Please add any extra details (time, landmarks, severity) before submitting.");
  return parts.join(" ");
};

// ==========================================
// OPTIMIZED SUB-COMPONENTS (Isolates re-renders)
// ==========================================

const Step1Upload = memo(({ onImageSelect, image }: { onImageSelect: (file: File | null) => void; image: File | null }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 1: Upload Photo</h2>
      <p className="text-xs text-zinc-500 mt-1">Upload a clear photo of the municipal issue to trigger the local neural networks.</p>
    </div>
    <div className="py-2" aria-label="Image Upload Container">
      <ImageUpload onFileSelect={onImageSelect} />
    </div>
  </div>
));
Step1Upload.displayName = "Step1Upload";

const Step2AI = memo(({
  imagePreview,
  autoFilling,
  geminiLoading,
  aiLogs,
  aiDetected,
  aiError,
  department,
  setDepartment,
  departmentOptions,
  isInvalidImage,
  geminiAnalysis
}: {
  imagePreview: string | null;
  autoFilling: boolean;
  geminiLoading: boolean;
  aiLogs: string[];
  aiDetected: { label: string; probability: number } | null;
  aiError: string | null;
  department: string;
  setDepartment: (value: string) => void;
  departmentOptions: string[];
  isInvalidImage: boolean;
  geminiAnalysis: GeminiAnalysisResult | null;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 2: AI Multi-Tier Vision Classification</h2>
      <p className="text-xs text-zinc-500 mt-1">
        Teachable Machine classifies edge image pixels; Gemini AI verifies and enriches municipal inspection details.
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2 items-stretch">
      <div className="relative rounded-xl overflow-hidden border border-zinc-200 aspect-video md:aspect-auto min-h-[220px]">
        {imagePreview && <img src={imagePreview} alt="Scan Preview" className="h-full w-full object-cover" />}
        {(autoFilling || geminiLoading) && (
          <>
            <div className="absolute inset-0 bg-primary/5 backdrop-blur-[0.5px]" />
            <motion.div
              initial={{ y: "-10%" }}
              animate={{ y: "110%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow"
            />
          </>
        )}
      </div>

      <div className="flex flex-col justify-between rounded-xl bg-zinc-950 p-5 text-zinc-200 shadow-inner" aria-live="polite">
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-2">
            <span className={`h-2 w-2 rounded-full ${autoFilling || geminiLoading ? "bg-amber-500 animate-pulse" : isInvalidImage ? "bg-rose-500" : "bg-emerald-500"}`} />
            <span className="text-[10px] tracking-wider uppercase text-zinc-500">TF.js & Gemini Log Stream</span>
          </div>
          {aiLogs.map((log, idx) => (
            <p key={idx} className="leading-relaxed">{log}</p>
          ))}
          {geminiLoading && <p className="text-amber-400 animate-pulse">&gt; Contacting secondary Gemini AI vision network...</p>}
          {autoFilling && !geminiLoading && <p className="text-zinc-500 animate-pulse">&gt; Processing matrix convolutions...</p>}
        </div>

        {!autoFilling && !geminiLoading && (aiDetected || aiError) && (
          <div className={`mt-4 flex items-center justify-between gap-1 text-xs border p-2.5 rounded-lg font-mono ${
            isInvalidImage || aiError ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            {aiError ? (
              <span>{aiError}</span>
            ) : (
              <>
                <span>Primary Class: {aiDetected?.label}</span>
                <span className="font-bold">({Math.round((aiDetected?.probability ?? 0) * 100)}%)</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {!autoFilling && isInvalidImage && (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
          <span>Invalid Image Detected — Submission Blocked</span>
        </div>
        <p className="text-xs text-rose-600 leading-relaxed">
          The uploaded image was classified as <strong>Invalid / Non-Civic Complaint</strong> ({Math.round((aiDetected?.probability ?? 0) * 100)}% confidence). Human photos, selfies, paper documents, clean non-issue images, or unrelated objects cannot be submitted.
        </p>
        <p className="text-[11px] font-semibold text-rose-700">
          Please click "Back" to Step 1 and upload a photo of a municipal civic issue (e.g. pothole, road crack, garbage pile, broken streetlight, or water pipeline leak).
        </p>
      </div>
    )}

    {!autoFilling && !isInvalidImage && geminiAnalysis && (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-primary/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900">
              Secondary Gemini AI Vision Inspection
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Enriched Analysis
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-2.5 border border-zinc-200/80">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Department</div>
            <div className="text-xs font-bold text-zinc-900 mt-0.5">{geminiAnalysis.department}</div>
          </div>

          <div className="rounded-lg bg-white p-2.5 border border-zinc-200/80">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Assessed Severity</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${
                geminiAnalysis.severity === "Critical" ? "bg-rose-600 animate-pulse" :
                geminiAnalysis.severity === "High" ? "bg-rose-500" :
                geminiAnalysis.severity === "Medium" ? "bg-amber-500" : "bg-emerald-500"
              }`} />
              <span className={`text-xs font-extrabold uppercase ${
                geminiAnalysis.severity === "Critical" ? "text-rose-700 font-black" :
                geminiAnalysis.severity === "High" ? "text-rose-600" :
                geminiAnalysis.severity === "Medium" ? "text-amber-700" : "text-emerald-700"
              }`}>
                {geminiAnalysis.severity}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-white p-2.5 border border-zinc-200/80">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">AI Confidence</div>
            <div className="text-xs font-bold text-zinc-900 mt-0.5">{Math.round(geminiAnalysis.confidence * 100)}%</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-800">{geminiAnalysis.title}</div>
          <p className="text-xs text-zinc-600 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-zinc-200/80">
            {geminiAnalysis.description}
          </p>
        </div>

        {geminiAnalysis.reason && (
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
            <span>💡 Inspection Note: {geminiAnalysis.reason}</span>
          </div>
        )}
      </div>
    )}

    {!autoFilling && !isInvalidImage && (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
        <label htmlFor="dept-override-select" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 cursor-pointer">
          <Sliders className="h-3.5 w-3.5" /> Department Routing Selection
        </label>
        <div>
          <select
            id="dept-override-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
          >
            <option value="">Select department</option>
            {departmentOptions.filter((d) => d !== "Invalid").map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
    )}
  </div>
));
Step2AI.displayName = "Step2AI";

const Step3Location = memo(({
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  location,
  setLocation,
  geoLogs,
  onManualEdit,
  onFetchGps,
  gpsLoading
}: {
  latitude: string;
  setLatitude: (value: string) => void;
  longitude: string;
  setLongitude: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  geoLogs: string[];
  onManualEdit: (field: "latitude" | "longitude" | "location") => void;
  onFetchGps: () => void;
  gpsLoading: boolean;
}) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 3: Interactive Location Pinpoint</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Click anywhere on OpenStreetMap, drag the pin, or detect live GPS coordinates in Puducherry UT.
        </p>
      </div>
      <button
        type="button"
        onClick={onFetchGps}
        disabled={gpsLoading}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all shrink-0 shadow-sm"
      >
        {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        Detect Live GPS
      </button>
    </div>

    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
      <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>CivicChain supports reports strictly inside <strong>Pondicherry / Puducherry</strong>.</span>
    </div>

    <LocationPickerMap
      latitude={latitude}
      longitude={longitude}
      onLocationSelect={(lat, lng) => {
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        onManualEdit("latitude");
        onManualEdit("longitude");
      }}
      className="h-[360px] w-full rounded-xl"
    />

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="lat-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Latitude</label>
        <input
          id="lat-input"
          type="text"
          value={latitude}
          onChange={(e) => { onManualEdit("latitude"); setLatitude(e.target.value); }}
          required
          placeholder="e.g. 11.9338"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 px-3 text-sm text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="lon-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Longitude</label>
        <input
          id="lon-input"
          type="text"
          value={longitude}
          onChange={(e) => { onManualEdit("longitude"); setLongitude(e.target.value); }}
          required
          placeholder="e.g. 79.8300"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 px-3 text-sm text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
        />
      </div>
    </div>

    <div>
      <label htmlFor="address-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Address / Area Details</label>
      <input
        id="address-input"
        type="text"
        value={location}
        onChange={(e) => { onManualEdit("location"); setLocation(e.target.value); }}
        required
        placeholder="Enter street name, area, or landmark in Puducherry UT"
        className="w-full rounded-lg border border-zinc-200 bg-white py-3 px-4 text-sm text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
      />
    </div>

    {geoLogs.length > 0 && (
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 font-mono text-[11px] text-zinc-400 space-y-1 shadow-inner" aria-live="polite">
        {geoLogs.map((log, idx) => (
          <p key={idx}>{log}</p>
        ))}
      </div>
    )}
  </div>
));
Step3Location.displayName = "Step3Location";

const Step4Details = memo(({
  title,
  setTitle,
  description,
  setDescription,
  onManualEdit
}: {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onManualEdit: (field: "title" | "description") => void;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 4: Ticket Details</h2>
      <p className="text-xs text-zinc-500 mt-1">Provide clear inputs for the maintenance team dispatcher.</p>
    </div>

    <div>
      <label htmlFor="title-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Title</label>
      <input
        id="title-input"
        type="text"
        value={title}
        onChange={(e) => { onManualEdit("title"); setTitle(e.target.value); }}
        required
        maxLength={50}
        placeholder="Short description title (e.g. Broken pothole Main Rd)"
        className="w-full rounded-lg border border-zinc-200 bg-white py-3 px-4 text-sm text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
      />
      <div className="mt-1.5 text-right text-[10px] font-semibold text-zinc-400" aria-live="polite">
        {title.length} / 50 characters
      </div>
    </div>

    <div>
      <label htmlFor="description-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Detailed Description</label>
      <textarea
        id="description-input"
        value={description}
        onChange={(e) => { onManualEdit("description"); setDescription(e.target.value); }}
        required
        rows={5}
        maxLength={300}
        placeholder="Describe issue depth, severity, nearby landmarks, or outage context."
        className="w-full rounded-lg border border-zinc-200 bg-white py-3 px-4 text-sm text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
      />
      <div className="mt-1.5 text-right text-[10px] font-semibold text-zinc-400" aria-live="polite">
        {description.length} / 300 characters
      </div>
    </div>
  </div>
));
Step4Details.displayName = "Step4Details";

const Step5Review = memo(({
  imagePreview,
  title,
  description,
  department,
  location,
  latitude,
  longitude
}: {
  imagePreview: string | null;
  title: string;
  description: string;
  department: string;
  location: string;
  latitude: string;
  longitude: string;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 5: Review Submission</h2>
      <p className="text-xs text-zinc-500 mt-1">Double check details before lodging ticket into the local network.</p>
    </div>

    <div className="grid gap-6 md:grid-cols-5 border-y border-zinc-150 py-5">
      <div className="md:col-span-2 rounded-xl overflow-hidden border border-zinc-200 shadow-sm aspect-video md:aspect-auto min-h-[160px]">
        {imagePreview && <img src={imagePreview} alt="Final Summary" className="h-full w-full object-cover" />}
      </div>

      <div className="md:col-span-3 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Issue Title</span>
          <p className="text-base font-bold text-zinc-900">{title}</p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Description</span>
          <p className="text-xs text-zinc-600 leading-relaxed mt-0.5">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Department</span>
            <span className="inline-block rounded bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 text-xs font-semibold mt-1">
              {department || "General"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Location Details</span>
            <p className="text-xs text-zinc-700 font-semibold mt-1">{location}</p>
            <span className="text-[10px] text-zinc-400 block mt-0.5">Lat/Lon: {latitude}, {longitude}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));
Step5Review.displayName = "Step5Review";

const Step6Success = memo(({
  ticketId,
  department,
  onReset,
  navigate
}: {
  ticketId: string;
  department: string;
  onReset: () => void;
  navigate: (path: string) => void;
}) => (
  <motion.div
    key="step6"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-10 space-y-6"
  >
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 border-2 border-emerald-200" aria-hidden="true">
      <CheckCircle className="h-9 w-9" />
    </div>

    <div className="space-y-2">
      <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">Ticket Lodged Successfully!</h2>
      <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
        Your report has been received, verified, and mapped onto the municipal network pipeline.
      </p>
    </div>

    <div className="max-w-md mx-auto rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
      <div className="flex justify-between items-center text-xs font-mono border-b border-zinc-200 pb-3">
        <span className="text-zinc-400">TICKET REFERENCE</span>
        <span className="font-bold text-zinc-800">{ticketId}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-left text-xs">
        <div>
          <span className="text-zinc-400 block font-semibold">Assigned Department:</span>
          <span className="font-bold text-zinc-800">{department}</span>
        </div>
        <div>
          <span className="text-zinc-400 block font-semibold">Expected Auditing:</span>
          <span className="font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" /> In 24 hours
          </span>
        </div>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
      <button onClick={() => navigate("/issues")} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 py-3 px-6 text-sm font-semibold text-white shadow shadow-zinc-800/10 hover:bg-zinc-800 hover:scale-[1.01] transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
        View Active Directory
      </button>
      <button
        onClick={onReset}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-3 px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2"
      >
        <RefreshCw className="h-4 w-4 text-zinc-400" /> Report Another
      </button>
      <button onClick={() => navigate("/dashboard")} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-3 px-6 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
        Back to Dashboard
      </button>
    </div>
  </motion.div>
));
Step6Success.displayName = "Step6Success";

// ==========================================
// MAIN WIZARD PAGE COMPONENT
// ==========================================

const ReportIssue = () => {
  const [step, setStep] = useState(1);
  const [ticketId, setTicketId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [department, setDepartment] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [isInvalidImage, setIsInvalidImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [aiDetected, setAiDetected] = useState<{ label: string; probability: number } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([...DEPARTMENTS]);
  const [geoLogs, setGeoLogs] = useState<string[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  const navigate = useNavigate();
  const editedRef = useRef({
    title: false,
    description: false,
    location: false,
    latitude: false,
    longitude: false,
    department: false,
  });

  const runIdRef = useRef(0);

  // MEMOIZED PREVIEW IMAGE URL (Prevents memory leaks and duplicate renders)
  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      setIsInvalidImage(false);
      setGeminiAnalysis(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/ai-model/metadata.json");
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        const labels = Array.isArray((data as { labels?: unknown })?.labels)
          ? ((data as { labels: unknown[] }).labels.filter((label): label is string => typeof label === "string" && label !== "Invalid") ?? [])
          : [];
        if (!cancelled && labels.length) setDepartmentOptions(labels);
      } catch {
        // Fallback
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!image) {
      setAiDetected(null);
      setAiError(null);
      setIsInvalidImage(false);
      setGeminiAnalysis(null);
      setGeminiLoading(false);
      setAutoFilling(false);
      setGeoLogs([]);
      setAiLogs([]);
      return;
    }

    const myRunId = (runIdRef.current += 1);
    setAutoFilling(true);
    setAiDetected(null);
    setAiError(null);
    setIsInvalidImage(false);
    setGeminiAnalysis(null);
    setGeminiLoading(false);
    setGeoLogs(["⌛ Awaiting image analysis..."]);
    setAiLogs(["⌛ Booting client vision neural network..."]);

    if (!editedRef.current.title) setTitle(buildAutoTitle(""));
    if (!editedRef.current.description) setDescription(buildAutoDescription({}));

    const run = async () => {
      const predictionPromise = import("@/lib/ai/departmentModel").then(async (m) => {
        setAiLogs(prev => [...prev, "🧬 Neural layers loaded successfully.", "🔬 Scanning 224x224 RGB tensor channels..."]);
        return {
          prediction: await m.predictDepartmentFromImage(image),
          mapper: m.mapPredictionToDepartment,
        };
      });

      const coordsPromise = (async () => {
        setGeoLogs(["📡 Querying device GPS module..."]);
        return getCurrentCoordinates({ enableHighAccuracy: true, timeout: 12_000 });
      })();

      let detectedDepartment: string | null = null;
      let detectedProbability: number | null = null;
      let latStr: string | null = null;
      let lonStr: string | null = null;
      let place: string | null = null;

      try {
        try {
          const res = await predictionPromise;
          if (runIdRef.current !== myRunId) return;

          if (res && res.prediction) {
            const mapped = res.mapper(res.prediction);
            setAiDetected({ label: res.prediction.label, probability: res.prediction.probability });

            if (mapped.isInvalid) {
              setIsInvalidImage(true);
              setAiError("Image classified as Invalid (Non-civic photo). Submission blocked.");
              setDepartment("");
              setAiLogs(prev => [
                ...prev,
                `⚠️ Class resolved: Invalid (${Math.round(res.prediction.probability * 100)}% confidence)`,
                "❌ Image does not contain a valid municipal civic complaint.",
                "🚫 Submission blocked. Please upload a clear photo of a civic issue."
              ]);
              toast.error("The uploaded image does not appear to contain a valid civic complaint. Submission blocked.", { duration: 6000 });
            } else {
              setIsInvalidImage(false);
              detectedDepartment = mapped.department;
              detectedProbability = res.prediction.probability;
              setAiLogs(prev => [
                ...prev,
                `✅ Scanning completed. Class resolved: ${res.prediction.label}`,
                `📊 Confidence level: ${Math.round(res.prediction.probability * 100)}%`,
                `🏢 Department Assigned: ${mapped.department || "General"}`
              ]);

              if (!editedRef.current.department && mapped.department) setDepartment(mapped.department);
              if (!editedRef.current.title && mapped.department) setTitle(buildAutoTitle(mapped.department));
              if (!editedRef.current.description) setDescription(buildAutoDescription({ dept: mapped.department }));

              // Trigger Secondary Gemini AI Analysis for Valid Images
              setGeminiLoading(true);
              setAiLogs(prev => [...prev, "🤖 Contacting secondary Gemini AI vision backend..."]);

              try {
                const formData = new FormData();
                formData.append("file", image);
                formData.append("department", mapped.department || "Road Infrastructure");

                const aiRes = await aiAPI.analyze(formData);
                if (runIdRef.current === myRunId && aiRes.data?.success && aiRes.data.analysis) {
                  const analysis = aiRes.data.analysis;

                  if (analysis.isCivicIssue === false) {
                    setIsInvalidImage(true);
                    setAiError("Gemini AI identified media as non-civic complaint.");
                    setDepartment("");
                    setAiLogs(prev => [
                      ...prev,
                      "❌ Gemini AI inspection confirmed: Non-civic complaint.",
                      "🚫 Submission blocked. Please upload a clear photo of a municipal issue."
                    ]);
                    toast.error("Gemini AI determined the uploaded photo is not a valid civic issue. Submission blocked.", { duration: 6000 });
                  } else {
                    setGeminiAnalysis(analysis);
                    setAiLogs(prev => [
                      ...prev,
                      `✨ Gemini AI Inspection Complete (Severity: ${analysis.severity})`,
                      `📝 Inspection Summary: ${analysis.title}`
                    ]);

                    if (!editedRef.current.title && analysis.title) {
                      setTitle(analysis.title);
                    }
                    if (!editedRef.current.description && analysis.description) {
                      setDescription(analysis.description);
                    }
                  }
                }
              } catch (geminiErr) {
                console.warn("Gemini secondary analysis notice:", geminiErr);
                setAiLogs(prev => [...prev, "⚠️ Gemini secondary analysis notice: Active local classification fallback."]);
              } finally {
                if (runIdRef.current === myRunId) setGeminiLoading(false);
              }
            }
          } else {
            setAiError("AI could not classify. Select department manually.");
            setAiLogs(prev => [...prev, "❌ Classification returned zero match array."]);
          }
        } catch (err) {
          console.error("TF model error:", err);
          setAiError("Model failed to load. Select department manually.");
          setAiLogs(prev => [...prev, "❌ Failed to load local TF layers."]);
        }

        try {
          const coords = await coordsPromise;
          if (runIdRef.current !== myRunId) return;

          latStr = toFixed6(coords.latitude);
          lonStr = toFixed6(coords.longitude);
          setGeoLogs(prev => [...prev, `📍 Coordinates lock: ${latStr}, ${lonStr}`, "🌐 Querying Nominatim for address details..."]);

          if (!editedRef.current.latitude) setLatitude(latStr);
          if (!editedRef.current.longitude) setLongitude(lonStr);

          if (!editedRef.current.location) {
            place = await reverseGeocode(coords);
            if (runIdRef.current !== myRunId) return;
            const locationText = place || `${latStr}, ${lonStr}`;
            place = locationText;
            setLocation(locationText);
            setGeoLogs(prev => [...prev, `🏡 Address resolved: ${locationText}`]);
          }
        } catch (geoErr) {
          setGeoLogs(prev => [...prev, "⚠️ Geolocation lookup failed or blocked."]);
          if (geoErr instanceof GeolocationError) {
            if (geoErr.reason === "insecure_context") {
              toast.message("Location blocked on HTTP. Enter manually.");
            } else if (geoErr.reason === "permission_denied") {
              toast.message("GPS permission denied. Enter manually.");
            } else if (geoErr.reason === "timeout") {
              toast.message("GPS timed out. Enter location manually.");
            } else {
              toast.message("GPS unavailable. Enter location manually.");
            }
          }
        }

        if (!editedRef.current.description) {
          setDescription(
            buildAutoDescription({
              dept: detectedDepartment,
              locationText: place,
              latitude: latStr,
              longitude: lonStr,
            }),
          );
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Auto-fill failed. Enter details manually."));
      } finally {
        if (runIdRef.current === myRunId) setAutoFilling(false);
      }
    };

    void run();
  }, [image]);

  const handleImageSelect = (file: File | null) => {
    setImage(file);
    if (file) {
      setTimeout(() => setStep(2), 300);
    }
  };

  const [gpsLoading, setGpsLoading] = useState(false);

  const handleFetchGpsLocation = async () => {
    setGpsLoading(true);
    setGeoLogs((prev) => [...prev, "📡 Requesting browser GPS position..."]);
    try {
      const coords = await getCurrentCoordinates({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      const latStr = coords.latitude.toFixed(6);
      const lonStr = coords.longitude.toFixed(6);
      setLatitude(latStr);
      setLongitude(lonStr);
      editedRef.current.latitude = true;
      editedRef.current.longitude = true;

      const isPuducherry = isWithinPuducherryUT(coords.latitude, coords.longitude);
      if (isPuducherry) {
        toast.success(`GPS Location Locked in Pondicherry (${latStr}, ${lonStr})`);
        setGeoLogs((prev) => [...prev, `✅ GPS locked inside Pondicherry: ${latStr}, ${lonStr}`]);
      } else {
        toast.warning("Warning: Selected location appears to be outside Pondicherry/Puducherry.");
        setGeoLogs((prev) => [...prev, `⚠️ Location outside Pondicherry bounds: ${latStr}, ${lonStr}`]);
      }

      const address = await reverseGeocode(coords);
      if (address) {
        setLocation(address);
        editedRef.current.location = true;
        setGeoLogs((prev) => [...prev, `🏡 Address: ${address}`]);
      }
    } catch (err: unknown) {
      if (err instanceof GeolocationError) {
        toast.error(`GPS Error: ${err.message}. You can set location manually or pick on map.`);
        setGeoLogs((prev) => [...prev, `❌ GPS error: ${err.message}`]);
      } else {
        toast.error("Failed to obtain GPS position. Enter address or pick on map.");
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const handleManualEdit = (field: "title" | "description" | "location" | "latitude" | "longitude") => {
    editedRef.current[field] = true;
  };

  const handleFormSubmit = async () => {
    if (isInvalidImage) {
      toast.error("Submission blocked: Uploaded image is invalid / non-civic complaint.");
      return;
    }

    if (latitude && longitude) {
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      if (!isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0)) {
        if (!isWithinPuducherryUT(latNum, lngNum)) {
          toast.error("CivicChain currently supports issue reporting only within Pondicherry/Puducherry.");
          return;
        }
      }
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("location", location);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("department", department);
    if (image) formData.append("image", image);

    try {
      await issuesAPI.create(formData);
      const generatedCode = `CCN-${Math.floor(10000 + Math.random() * 90000)}-${department.slice(0, 3).toUpperCase()}`;
      setTicketId(generatedCode);
      toast.success("Issue submitted successfully!");
      setStep(6);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to submit report"));
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !image) {
      toast.error("Please upload an image first.");
      return;
    }
    if ((step === 1 || step === 2) && isInvalidImage) {
      toast.error("Cannot proceed: Uploaded photo was classified as Invalid / Non-Civic. Please upload a valid municipal issue photo.");
      return;
    }
    if (step === 3) {
      if (!location || !latitude || !longitude) {
        toast.error("Please enter location details.");
        return;
      }
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      if (!isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0)) {
        if (!isWithinPuducherryUT(latNum, lngNum)) {
          toast.error("CivicChain currently supports issue reporting only within Pondicherry/Puducherry.");
          return;
        }
      }
    }
    if (step === 4 && (!title || !description || !department)) {
      toast.error("Please fill in all details.");
      return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => Math.max(1, prev - 1));

  const resetForm = () => {
    setImage(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setDepartment("");
    setAiDetected(null);
    setIsInvalidImage(false);
    setAiLogs([]);
    setGeoLogs([]);
    editedRef.current = { title: false, description: false, location: false, latitude: false, longitude: false, department: false };
    setStep(1);
  };

  const stepsList = [
    { num: 1, label: "Photo", icon: Camera },
    { num: 2, label: "AI Scan", icon: Brain },
    { num: 3, label: "Location", icon: MapPin },
    { num: 4, label: "Details", icon: FileText },
    { num: 5, label: "Review", icon: Eye },
    { num: 6, label: "Done", icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-16">
      <Navbar />
      
      <div className="container mx-auto max-w-3xl px-4 py-8">
        
        {/* Step Indicator Header bar */}
        <div className="mb-10 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm overflow-x-auto select-none" aria-label="Progress tracker">
          <div className="flex items-center justify-between min-w-[500px] px-2">
            {stepsList.map((s, idx) => {
              const StepIcon = s.icon;
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              
              return (
                <div key={s.num} className="flex items-center" aria-current={isCurrent ? "step" : undefined}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                      isCurrent
                        ? "bg-primary border-primary text-white shadow shadow-primary/20"
                        : isCompleted
                          ? "bg-secondary/15 border-secondary text-secondary"
                          : "bg-zinc-50 border-zinc-200 text-zinc-400"
                    }`}>
                      <StepIcon className="h-4.5 w-4.5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-zinc-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < stepsList.length - 1 && (
                    <div className={`h-0.5 w-12 sm:w-16 mx-2 transition-colors ${step > s.num ? "bg-secondary/40" : "bg-zinc-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Panel */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-md">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                <Step1Upload onImageSelect={handleImageSelect} image={image} />
                {image && (
                  <div className="flex justify-end pt-2 border-t border-zinc-100">
                    <button onClick={nextStep} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 py-2.5 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                      Next Step <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                <Step2AI
                  imagePreview={imagePreview}
                  autoFilling={autoFilling}
                  geminiLoading={geminiLoading}
                  aiLogs={aiLogs}
                  aiDetected={aiDetected}
                  aiError={aiError}
                  department={department}
                  setDepartment={setDepartment}
                  departmentOptions={departmentOptions}
                  isInvalidImage={isInvalidImage}
                  geminiAnalysis={geminiAnalysis}
                />
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={prevStep} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={nextStep} disabled={autoFilling || geminiLoading || isInvalidImage} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 py-2.5 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:scale-[1.01] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                <Step3Location
                  latitude={latitude}
                  setLatitude={setLatitude}
                  longitude={longitude}
                  setLongitude={setLongitude}
                  location={location}
                  setLocation={setLocation}
                  geoLogs={geoLogs}
                  onManualEdit={handleManualEdit}
                  onFetchGps={handleFetchGpsLocation}
                  gpsLoading={gpsLoading}
                />
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={prevStep} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={nextStep} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 py-2.5 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                <Step4Details
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  onManualEdit={handleManualEdit}
                />
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={prevStep} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={nextStep} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 py-2.5 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                    Next Step <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-6"
              >
                <Step5Review
                  imagePreview={imagePreview}
                  title={title}
                  description={description}
                  department={department}
                  location={location}
                  latitude={latitude}
                  longitude={longitude}
                />
                <div className="flex justify-between pt-4">
                  <button onClick={prevStep} disabled={loading} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={handleFormSubmit} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-primary py-2.5 px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-[1.01] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Submit LOP Ticket</>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <Step6Success ticketId={ticketId} department={department} onReset={resetForm} navigate={navigate} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ReportIssue;
