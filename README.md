# CivicChain — AI-Powered Civic Incident Dispatch & Smart City Platform
> **Target Scope**: Pondicherry / Puducherry, India.

CivicChain is an AI-powered civic issue reporting and smart city incident dispatch platform designed for Pondicherry/Puducherry. It connects citizens directly with municipal departments (Sanitation, Road Infrastructure, Water Supply, Electricity, Public Safety) for real-time reporting, AI vision verification, GPS location tracking, and departmental status resolution pipelines.

---

## 🏛️ Scope & Geographic Boundary
CivicChain is designed specifically for Pondicherry / Puducherry. All location tracking, boundary checks, map views, and heat maps are focused on civic issues within the Pondicherry/Puducherry region.

---

## Key Features & Capabilities

- **AI Multi-Tier Vision Classification**: Dual edge-scanning using TensorFlow.js local model for immediate classification + Google Gemini 1.5 for municipal inspection enrichment.
- **GPS Location & Boundary Validation**: Live GPS detection (`enableHighAccuracy: true`) with GeoJSON `locationPoint` storage, 2dsphere spatial indexing, and strict backend HTTP 400 enforcement against outside coordinates.
- **Dynamic Leaflet Heat Map**: Interactive heat map with `ResizeObserver` size invalidation, displaying issue density strictly within Pondicherry/Puducherry.
- **Role-Based Access Control (RBAC)**: Distinct portals for Citizens and Department Authorities with strict backend department isolation.
- **Cloudinary Image Pipeline**: Optimized Cloudinary image transformations (`q_auto`, `f_auto`, dynamic resizing) with local fallback.
- **Mobile-First Responsive UI**: Layouts scaling seamlessly from 320px mobile screens up to 2560px ultra-wide desktop displays.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Leaflet, Lucide Icons, Sonner Toast |
| **AI / Vision** | Local TensorFlow.js Model + Google Gemini 1.5 API Integration |
| **Backend** | Node.js, Express.js, JWT Authentication, Bcrypt password hashing |
| **Security & Middleware** | Helmet CSP, Express Rate Limiter, CORS, NoSQL Injection Sanitizer |
| **Database** | MongoDB Atlas, Mongoose (GeoJSON `Point` & `2dsphere` spatial index) |
| **Media Storage** | Cloudinary CDN with dynamic transformation pipelines |

---

## System Routes & Navigation Architecture

### Citizen Routes
- `/` — Landing Page
- `/dashboard` — Citizen Hub (Logged-in User Overview & Recent Reports)
- `/my-stats` — Dedicated Citizen Complaint Analytics & Filter Tabs
- `/report` — 6-Step Progressive Incident Lodging Wizard
- `/issues` — Public Issues Directory & Search/Filter Grid
- `/issues/:id` — Incident Details, Timeline, & Location Heat Map

### Authority Routes
- `/authority/dashboard` — Department Dispatch Command Center & Ticket Table
- `/authority/stats` — Dedicated Department Performance Analytics & Metrics
- `/authority/issues` — Department Ticket Directory
- `/authority/issues/:id` — Department Ticket Management & Status Operations
- `/authority/upvoted` — Department Community Priorities
- `/authority/heatmap` — Department-Specific Incident Density Heat Map

---

## Environment Configuration

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/civicchain
JWT_SECRET=your_production_jwt_secret_key
FRONTEND_URL=https://your-civicchain.vercel.app
GEMINI_API_KEY=your_google_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Local Development Setup

1. **Clone & Install Dependencies**:
   ```bash
   cd backend
   npm install
   
   cd ../frontend
   npm install
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   npm start
   ```

3. **Start Frontend Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## Production Deployment Guide

- **Frontend Deployment (Vercel)**:
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Environment Variable: `VITE_API_URL=https://your-backend.onrender.com/api`

- **Backend Deployment (Render)**:
  - Environment: `Node.js`
  - Build Command: `npm install`
  - Start Command: `node server.js` or `npm start`
  - Environment Variables: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `CLOUDINARY_*`, `GEMINI_API_KEY`

---

## Testing & Verification

- **TypeScript Verification**: `npx tsc --noEmit`
- **Production Build Verification**: `npm run build`

---

&copy; 2025 CivicChain | Pondicherry Smart City Platform
