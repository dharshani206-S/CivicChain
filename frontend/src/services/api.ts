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
  getById: (id: string) => api.get(`/issues/${id}`),
  create: (data: FormData) =>
    api.post("/issues", data),
  vote: (id: string) => api.put(`/issues/${id}/vote`),
  updateStatus: (id: string, status: string) => api.put(`/issues/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/issues/${id}`),
};

export const getUploadUrl = (image?: string | null) => {
  if (!image) return null;

  // Already a full URL or a browser-managed URL
  if (/^(https?:)?\/\//.test(image) || image.startsWith("data:") || image.startsWith("blob:")) {
    return image;
  }

  // Already an absolute path (works with a dev proxy or same-origin hosting)
  if (image.startsWith("/")) return image;

  // Backend stores only the filename (e.g. "171234-foo.jpg")
  return API_ORIGIN ? `${API_ORIGIN}/uploads/${image}` : `/uploads/${image}`;
};

export default api;
