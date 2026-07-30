import path from "path";
import dotenv from "dotenv";

dotenv.config();
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: path.join(process.cwd(), "backend", ".env") });
}

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// ==========================================
// 1. HELMET SECURITY HEADERS
// ==========================================
app.use(helmet());

// Configure CSP (Content Security Policy) to allow serving local uploaded photos
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*"],
    },
  })
);

// ==========================================
// 2. SECURE CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// ==========================================
// 3. MORGAN REQUEST LOGGING
// ==========================================
app.use(morgan("combined"));

// Body parsing middlewares (with size restrictions)
app.use(express.json({ limit: "10kb" })); // Limit JSON payloads to 10kb to prevent DDoS
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ==========================================
// 4. NOSQL INJECTION SANITIZATION (Express 5 Compatible)
// ==========================================
const sanitizeObject = (obj) => {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith("$") || key.includes(".")) {
          delete obj[key];
        } else {
          sanitizeObject(obj[key]);
        }
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
});

// Serve uploads folder static files safely
app.use("/uploads", express.static("uploads"));

// ==========================================
// 5. RATE LIMITERS
// ==========================================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP. Please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 authentication requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again after 15 minutes." },
});

// Apply rate limits
app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ==========================================
// 6. ROUTE DECLARATIONS
// ==========================================
app.use("/api/issues", issueRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.send("🚀 CivicChain API Running");
});

// ==========================================
// 7. CENTRALIZED ERROR HANDLING MIDDLEWARE
// ==========================================
app.use(errorHandler);

// Database Connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("❌ ERROR: MONGO_URI environment variable is not defined in process.env or .env!");
  process.exit(1);
}
mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB Connected to: " + mongoUri))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});