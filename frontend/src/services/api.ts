import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api";

const API_ORIGIN = (() => {
  try {
    // Handles absolute URLs like http://localhost:5000/api
    return new URL(API_BASE_URL).origin;
  } catch {
    // Handles relative base URLs like /api
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
})();

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { email: string; password: string; department?: string }) =>
    api.post("/auth/login", data),
  register: (data: { name: string; email: string; password: string; role: string; department?: string }) =>
    api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
};

export const issuesAPI = {
  getAll: () => api.get("/issues"),
  getMyIssues: () => api.get("/issues/mine"),
  getById: (id: string) => api.get(`/issues/${id}`),
  create: (data: FormData) =>
    api.post("/issues", data),
  vote: (id: string) => api.put(`/issues/${id}/vote`),
  updateStatus: (id: string, status: string) => api.put(`/issues/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/issues/${id}`),
  getCitizenAnalytics: () => api.get("/issues/analytics/citizen"),
  getAuthorityAnalytics: () => api.get("/issues/analytics/authority"),
};
export interface GeminiAnalysisResult {
  isCivicIssue: boolean;
  category: string;
  department: string;
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  reason: string;
}

export const aiAPI = {
  analyze: (data: FormData) =>
    api.post<{ success: boolean; source: string; analysis: GeminiAnalysisResult }>("/ai/analyze", data),
};

export const getUploadUrl = (
  image?: string | null,
  options?: { width?: number; height?: number }
): string | null => {
  if (
    !image ||
    typeof image !== "string" ||
    image.trim() === "" ||
    image === "null" ||
    image === "undefined"
  ) {
    return null;
  }

  const trimmed = image.trim();

  // 1. Cloudinary URL optimization (w_600,h_275,c_fill,q_auto,f_auto)
  if (trimmed.includes("res.cloudinary.com") && trimmed.includes("/upload/")) {
    const width = options?.width || 600;
    const height = options?.height || 275;
    const transformation = `w_${width},h_${height},c_fill,q_auto,f_auto`;
    return trimmed.replace("/upload/", `/upload/${transformation}/`);
  }

  // 2. Absolute HTTP/HTTPS URLs (leave intact)
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 3. Local relative upload paths (/uploads/...) resolved against API_ORIGIN
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const apiOrigin = API_ORIGIN || "http://localhost:5000";
  return `${apiOrigin}${cleanPath}`;
};
  

export default api;
