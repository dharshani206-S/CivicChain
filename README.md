# CivicChain - Smart City Operations Hub

CivicChain is a premium, secure, and modern smart city operations and ticketing platform designed to connect citizens directly with municipal maintenance workflows. Using local machine learning classification and real-time mapping coordinates, citizens can report infrastructure issues, while department authorities dispatch assessments and manage statuses.

---

## 🚀 Key Features

* **SaaS Command Dashboard**: Dynamic statistics dashboard featuring Recharts data infographics, an operations activity log feed, and an interactive coordinate pinpoint SVG map.
* **6-Step Progressive Wizard**: Fully optimized reporting flow (Photo upload, local TensorFlow.js vision scanning, GPS coordinate locks, descriptions inputs, dual column parameters reviews, and generated reference tickets).
* **Department-Locked Access Control (RBAC)**: Backend-enforced route protection. Authorities are restricted to viewing and managing incidents in their respective department queue.
* **High Security Architecture**: Hardened with Helmet HTTP headers, NoSQL query injection sanitizers, rate limiters on auth entries, 12-round password hashes, and environment variables.

---

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, TailwindCSS (HSL variables), Framer Motion, Recharts, Lucide Icons, TensorFlow.js.
* **Backend**: Node.js, Express, MongoDB (Mongoose schemas with indexes), Multer (validated file upload), BcryptJS, JsonWebToken (JWT).

---

## 📑 Project Documentation Index

* 📘 **[Installation & Setup Guide](docs/installation.md)**: Steps to spin up backend services and frontend clients locally.
* 🌐 **[Production Deployment Manual](docs/deployment.md)**: Guidelines for configuring MongoDB Atlas, Render (Node backend), and Vercel (Vite client).
* ⚙️ **[API Endpoint Reference](docs/api.md)**: Specifications for authentication, user sessions, ticket creation, status pipeline updates, and upvoting.
* 🔬 **[System Architecture & Design System](docs/architecture.md)**: Detailed breakdown of database indexing keys, secure middleware stacks, HSL styling palettes, and TF.js model architectures.
