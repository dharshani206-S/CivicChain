import { useEffect, useRef, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { issuesAPI } from "@/services/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";
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
  Sparkles
} from "lucide-react";
import { DEPARTMENTS } from "@/constants/departments";
import { getApiErrorMessage } from "@/utils/api";
import { GeolocationError, getCurrentCoordinates, reverseGeocode } from "@/lib/geolocation";
import { motion, AnimatePresence } from "framer-motion";

const toFixed6 = (value: number) => value.toFixed(6);

const buildAutoTitle = (dept: string) => {
  if (!dept) return "Reported issue";
  if (dept.toLowerCase().includes("street")) return "Street light outage";
  if (dept.toLowerCase().includes("sewer")) return "Sewerage block";
  if (dept.toLowerCase().includes("sanit")) return "Sanitation cleaning required";
  if (dept.toLowerCase().includes("public")) return "Pothole / Road damage";
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
  aiLogs,
  aiDetected,
  aiError,
  department,
  setDepartment,
  departmentOptions
}: {
  imagePreview: string | null;
  autoFilling: boolean;
  aiLogs: string[];
  aiDetected: { label: string; probability: number } | null;
  aiError: string | null;
  department: string;
  setDepartment: (value: string) => void;
  departmentOptions: string[];
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 2: AI Vision Classification</h2>
      <p className="text-xs text-zinc-500 mt-1">TensorFlow model is analyzing image pixels on device.</p>
    </div>

    <div className="grid gap-6 md:grid-cols-2 items-stretch">
      <div className="relative rounded-xl overflow-hidden border border-zinc-200 aspect-video md:aspect-auto min-h-[220px]">
        {imagePreview && <img src={imagePreview} alt="Scan Preview" className="h-full w-full object-cover" />}
        {autoFilling && (
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
            <span className={`h-2 w-2 rounded-full ${autoFilling ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-[10px] tracking-wider uppercase text-zinc-500">TF.js Log Viewer</span>
          </div>
          {aiLogs.map((log, idx) => (
            <p key={idx} className="leading-relaxed">{log}</p>
          ))}
          {autoFilling && <p className="text-zinc-500 animate-pulse">&gt; Processing matrix convolutions...</p>}
        </div>

        {!autoFilling && (aiDetected || aiError) && (
          <div className={`mt-4 flex items-center justify-between gap-1 text-xs border p-2.5 rounded-lg font-mono ${
            aiError ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            {aiError ? (
              <span>{aiError}</span>
            ) : (
              <>
                <span>Class: {aiDetected?.label}</span>
                <span className="font-bold">({Math.round((aiDetected?.probability ?? 0) * 100)}%)</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {!autoFilling && (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
        <label htmlFor="dept-override-select" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 cursor-pointer">
          <Sliders className="h-3.5 w-3.5" /> Override Classification Suggestion
        </label>
        <div>
          <select
            id="dept-override-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 px-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
          >
            <option value="">Select fallback department</option>
            {departmentOptions.map((d) => (
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
  onManualEdit
}: {
  latitude: string;
  setLatitude: (value: string) => void;
  longitude: string;
  setLongitude: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  geoLogs: string[];
  onManualEdit: (field: "latitude" | "longitude" | "location") => void;
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Step 3: Location Pinpoint</h2>
      <p className="text-xs text-zinc-500 mt-1">Review solved coordinates or manually override inputs below.</p>
    </div>

    <div className="relative aspect-video w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-inner overflow-hidden" aria-label="Visual coordinate pinpoint map grid">
      <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M 0,40 L 800,450 M 100,0 L 200,500 M 400,0 L 450,500 M 0,250 L 800,200" stroke="#000" strokeWidth="2.5" fill="none" />
        <circle cx="150" cy="180" r="40" fill="#000" />
        <circle cx="550" cy="300" r="80" fill="#000" />
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-secondary/20 opacity-75" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white shadow shadow-secondary/30">
          <MapPin className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded-md bg-white border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-500 shadow-sm font-mono">
        Locked Lat/Lon: {latitude || "0.0"}, {longitude || "0.0"}
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="lat-input" className="mb-1.5 block text-xs font-bold text-zinc-700 uppercase tracking-wider">Latitude</label>
        <input
          id="lat-input"
          type="text"
          value={latitude}
          onChange={(e) => { onManualEdit("latitude"); setLatitude(e.target.value); }}
          required
          placeholder="e.g. 28.6139"
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
          placeholder="e.g. 77.2090"
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
        placeholder="Enter street name, sector, or landmark"
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
          ? ((data as { labels: unknown[] }).labels.filter((label): label is string => typeof label === "string") ?? [])
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
      setAutoFilling(false);
      setGeoLogs([]);
      setAiLogs([]);
      return;
    }

    const myRunId = (runIdRef.current += 1);
    setAutoFilling(true);
    setAiDetected(null);
    setAiError(null);
    setGeoLogs(["⌛ Awaiting image analysis..."]);
    setAiLogs(["⌛ Booting client vision neural network..."]);

    if (!editedRef.current.title) setTitle(buildAutoTitle(""));
    if (!editedRef.current.description) setDescription(buildAutoDescription({}));

    const run = async () => {
      const predictionPromise = import("@/lib/ai/departmentModel").then(async (m) => {
        setAiLogs(prev => [...prev, "🧬 Neural layers loaded successfully.", "🔬 Scanning pixels channels..."]);
        return m.predictDepartmentFromImage(image);
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
          const prediction = await predictionPromise;
          if (runIdRef.current !== myRunId) return;

          if (prediction) {
            detectedDepartment = prediction.label;
            detectedProbability = prediction.probability;
            setAiDetected({ label: detectedDepartment, probability: detectedProbability });
            setAiLogs(prev => [
              ...prev,
              `✅ Scanning completed. Class resolved: ${prediction.label}`,
              `📊 Confidence level: ${Math.round(prediction.probability * 100)}%`
            ]);

            if (!editedRef.current.department) setDepartment(detectedDepartment);
            if (!editedRef.current.title) setTitle(buildAutoTitle(detectedDepartment));
            if (!editedRef.current.description) setDescription(buildAutoDescription({ dept: detectedDepartment }));
          } else {
            setAiError("AI could not classify. Select department manually.");
            setAiLogs(prev => [...prev, "❌ Classification returned zero match array."]);
          }
        } catch {
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

  const handleManualEdit = (field: "title" | "description" | "location" | "latitude" | "longitude") => {
    editedRef.current[field] = true;
  };

  const handleFormSubmit = async () => {
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
    if (step === 3 && (!location || !latitude || !longitude)) {
      toast.error("Please enter location details.");
      return;
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
                  aiLogs={aiLogs}
                  aiDetected={aiDetected}
                  aiError={aiError}
                  department={department}
                  setDepartment={setDepartment}
                  departmentOptions={departmentOptions}
                />
                <div className="flex justify-between pt-4 border-t border-zinc-100">
                  <button onClick={prevStep} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 py-2.5 px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:ring-offset-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={nextStep} disabled={autoFilling} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 py-2.5 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-all hover:scale-[1.01] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
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
