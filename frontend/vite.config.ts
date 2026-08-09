import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
    ...(fs.existsSync(path.resolve(__dirname, ".cert/key.pem")) &&
    fs.existsSync(path.resolve(__dirname, ".cert/cert.pem"))
      ? {
          https: {
            key: fs.readFileSync(path.resolve(__dirname, ".cert/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, ".cert/cert.pem")),
          },
        }
      : {}),
    proxy: {
      // Avoid CORS + prevent HTTPS mixed-content by proxying to the backend in dev.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 150,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@tensorflow")) {
            return "tensorflow-vendor";
          }
          if (id.includes("node_modules/leaflet")) {
            return "leaflet-vendor";
          }
          if (id.includes("node_modules/recharts")) {
            return "recharts-vendor";
          }
        },
      },
    },
  },
}));
