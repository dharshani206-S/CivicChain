# CivicChain Frontend

CivicChain is a civic issue reporting and tracking app. Citizens can report issues (optionally with a photo), browse existing issues, and vote. Authorities can sign in by department to monitor and manage issues.

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Axios

## Local development

### 1) Start the backend

From the repo root:

```sh
cd backend
npm install
npm start
```

The backend runs on `http://localhost:5000` by default.

### 2) Start the frontend

From `frontend/`:

```sh
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:8080` by default.

## Environment variables

Create `frontend/.env.local` (optional):

```sh
VITE_API_BASE_URL=http://localhost:5000/api
```

If not set, the frontend defaults to `/api` and relies on the Vite dev proxy.

## HTTPS (optional)

Browsers show **Not secure** when the site is served over plain HTTP. For local HTTPS, generate a trusted dev certificate and place it in `frontend/.cert/`:

Note: **Geolocation (GPS) is blocked on non-HTTPS origins** (except `localhost`). If you open the dev server from a colleague's machine / phone via a LAN IP, you'll need HTTPS for auto-location to work.

```sh
# Using mkcert (recommended)
mkcert -install
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem 192.168.56.1 localhost 127.0.0.1 ::1
```

Then restart `npm run dev` and open `https://192.168.56.1:8080` (or your host).

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run preview` - preview build
- `npm run lint` - ESLint
- `npm run test` - Vitest
