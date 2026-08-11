# SmartLeave — Leave Management System (MERN)

A web-based leave management system for **LGU San Julian, Eastern Samar**. Employees file leave requests, department heads recommend them, HR verifies credits and documents, and the mayor gives final approval — all with automatic leave-record tracking and CS Form 6 generation.

Built with the **MERN** stack: **MongoDB, Express.js, React, Node.js**.

> This README explains how to **run the system on your own localhost** for development. For the full IT handover guide (repository transfer, secrets, data backup, production deployment), see **[`HANDOVER.md`](HANDOVER.md)**.

---

## Features

- **4 user roles** with separate dashboards: Employee, Department Admin, HR Manager, Mayor
- Leave request workflow with a guided review stepper for each approval stage
- Vacation / Sick / Undertime leave types with earned-credit tracking
- Monthly and overall **leave records** with balances (approval-only entries, cancelled entries flagged)
- **CS Form 6** digital form with drawn/uploaded signatures
- Profile signatures, profile pictures, and supporting document uploads
- Email notifications (optional, Brevo)
- JWT authentication and role-based authorization

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS, daisyUI, React Router 7 |
| Backend | Node.js, Express 5, Mongoose (MongoDB ODM) |
| Database | MongoDB |
| File storage | Cloudinary (profile pictures, leave documents) |
| Notifications | Email via Brevo (optional), Firebase (currently disabled) |

## Project Structure

```
smart-leave-mern/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/            # One file per page/module (HRLeaveRecord.jsx, MayorLeaveRequestDetails.jsx, ...)
│   │   ├── services/              # API calls (api.js, mayorService.js, ...)
│   │   ├── App.jsx                # Routes for each user type
│   │   └── main.jsx
│   ├── vite.config.js             # Dev server on port 3000; proxies /api -> localhost:5000
│   └── package.json
├── server/                        # Node backend
│   ├── server.js                  # Entry point: Express app + route registration
│   ├── routes/                    # API route definitions
│   ├── controllers/               # Business logic (Leave, HR, Mayor, LeaveRecord, ...)
│   ├── models/                    # Mongoose schemas (User, LeaveRequest, LeaveRecord, Department)
│   ├── middleware/                # Auth, upload, validation
│   ├── config/ + utils/           # Cloudinary, email, helpers
│   ├── create-all-users.js        # Seed script (default test accounts)
│   └── package.json
├── railway.toml                   # Backend deployment config (Railway)
└── HANDOVER.md                    # IT handover & production guide
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | **v20 LTS** (v18+ works, v24 tested) | Includes npm |
| [MongoDB](https://www.mongodb.com/try/download/community) | v6+ (v4.4+ works) | Community Server is fine |
| [Git](https://git-scm.com) | any recent | Clone the repo |

Optionally install [MongoDB Compass](https://www.mongodb.com/products/compass) to inspect data visually.

Verify your installation:

```bash
node --version   # v20.x
npm --version    # 10.x
git --version
```

---

## Setup — Run on Localhost

### Step 1. Get the code

```bash
git clone <repository-url>
cd smart-leave-mern
```

### Step 2. Start MongoDB

**Option A — Local MongoDB (recommended for development)**

Install MongoDB Community Server. On Windows it registers as a service automatically; verify it's listening:

```bash
# Windows
netstat -an | findstr 27017
# macOS / Linux
netstat -an | grep 27017
```

The app connects to `mongodb://localhost:27017/smartleave` by default — no configuration needed.

**Option B — MongoDB Atlas (free tier)**

1. Create a free cluster at https://www.mongodb.com/atlas
2. Whitelist your IP under **Network Access**
3. Copy the connection string and use it as `MONGODB_URI` in Step 3

### Step 3. Set up the backend

```bash
cd server
npm install
```

Create a file named **`.env`** inside `server/` (it is git-ignored — never commit it):

```bash
# ===== REQUIRED =====
# Must be 5000 for local development (the frontend proxy expects it)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartleave
JWT_SECRET=change-me-to-a-long-random-string

# Cloudinary — required for profile picture & leave document uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ===== OPTIONAL (leave blank to disable) =====
# Email notifications (Brevo)
BREVO_API_KEY=
EMAIL_FROM=smartleave@example.com
# Base URL used in email links
FRONTEND_URL=http://localhost:3000
```

> **Important:** the frontend proxies `/api` requests to **port 5000**. If `PORT` is set to anything else, the app will not work. Set `PORT=5000` for local development.

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create a free Cloudinary account at https://cloudinary.com and copy the API keys from the Dashboard. **Without them, uploads (profile pictures, leave documents) will fail** — everything else still works.

Start the backend:

```bash
npm run dev     # development — auto-restarts on file changes
# or
npm start       # plain node, no auto-reload
```

You should see:

```
Connected to MongoDB
Server is running on port 5000
```

Verify at http://localhost:5000 → `{"message":"SmartLeave API is running"}`.

### Step 4. Set up the frontend

In a **second terminal**:

```bash
cd client
npm install
```

Create **`client/.env`** (optional — local defaults work without it):

```bash
# Optional. Defaults to the Vite proxy at http://localhost:5000
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open **http://localhost:3000** — you should see the SmartLeave login page. The Vite dev server automatically proxies `/api` calls to the backend on port 5000.

> Both servers must run at the same time — use **two terminals**.

### Step 5. Seed test accounts

```bash
cd server
node create-all-users.js
```

This creates one department and four accounts (existing users are skipped):

| Role | User ID | Password |
|---|---|---|
| Employee | `EMP001` | `password123` |
| Department Admin | `DA001` | `password123` |
| HR Manager | `HR001` | `password123` |
| Mayor | `MA001` | `password123` |

Log in at http://localhost:3000 to see each role's dashboard.

> **Security:** these are public default credentials. Before real use, change the passwords or create real staff accounts (HR → **Employees**), and never commit real credentials to the repo.

---

## Verify the Full Workflow

A quick smoke test that the whole stack is wired correctly:

1. Log in as `EMP001` → **File Leave** (e.g., 1-day Vacation) → attach a supporting document.
2. Log in as `DA001` → review and **recommend** it.
3. Log in as `HR001` → verify credits and **approve**.
4. Log in as `MA001` → **final approve**.
5. Log in as `EMP001` → confirm the request shows **Approved**, the leave record shows the deduction, and **View CS Form 6** renders (drawn/uploaded signature).

---

## Adding Features — Developer Notes

**Stack conventions:**

- Backend is **CommonJS** (`require` / `module.exports`); frontend is **ES modules**.
- New endpoints: route in `server/routes/` → logic in `server/controllers/` → validation in `server/middleware/`.
- New data: schema in `server/models/` (models are auto-loaded from `server/models/index.js`).
- New pages: component in `client/src/components/` → route in `client/src/App.jsx`.
- API calls go through `client/src/services/` (axios, base URL from `VITE_API_URL` or the Vite proxy).
- Style with Tailwind/daisyUI — reuse existing classes.

**Useful scripts (run from `server/`):**

```bash
node check-users.js     # list all users
node list-users.js      # list users with roles
node create-user.js     # create a single user (edit the file first)
```

---

## Deployment (Production)

- **Backend:** [`railway.toml`](railway.toml) deploys the API on Railway (`cd server && npm start`). Railway sets `PORT` itself and you paste the env vars into the dashboard.
- **Frontend:** `cd client && npm run build` → deploy the `dist/` folder to Vercel/Netlify, with `VITE_API_URL` pointing at the deployed API.
- CORS already allows `http://localhost:3000`, `localhost` origins in general, and the deployed `https://smart-leave-mern.vercel.app` / any `*.vercel.app` domain.

See **[`HANDOVER.md`](HANDOVER.md)** for the complete production handover guide.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Pages load but no data / requests fail | Server not running, or wrong `PORT` | Check `server/.env` has `PORT=5000`; server terminal shows "Server is running on port 5000" |
| `ECONNREFUSED` on port 27017 | MongoDB not running | Install/start MongoDB; verify with `netstat -an \| findstr 27017` (Windows) |
| Signature image upload fails | File too large (>5 MB) or server JSON limit | Use a smaller PNG/JPG (under 5 MB) |
| Profile picture / document uploads fail | Cloudinary keys missing or wrong | Fill `CLOUDINARY_*` in `server/.env` and restart the server |
| Port 3000 or 5000 already in use | Another process | `netstat -ano \| findstr :3000` (Windows) → kill the PID, or change the port in both places |
| Frontend on another machine can't reach the API | Vite proxy only works on localhost | Set `VITE_API_URL` to the machine's LAN IP and allow that origin in `server.js` CORS |

---

## License

Private project for LGU San Julian — internal use.
