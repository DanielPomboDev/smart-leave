# SmartLeave — Handover Guide for LGU San Julian IT

This document is the complete guide for taking over the **SmartLeave Management System** — a MERN (MongoDB, Express.js, React, Node.js) leave-management application — and running it on your own machines (localhost) so the team can add features.

> **Target audience:** LGU San Julian IT staff who will maintain and extend the system.
> **Time to set up locally:** ~30–60 minutes on a fresh machine.

---

## 1. What you are receiving

| Part | Tech | Where | What it does |
|---|---|---|---|
| **Frontend** | React 19 + Vite 6 + Tailwind + daisyUI | `client/` | The web app (login, dashboards, leave forms, HR records, mayor approvals) |
| **Backend** | Node.js + Express 5 + Mongoose | `server/` | REST API (`/api/*`), auth, approvals, leave records, notifications |
| **Database** | MongoDB | — | Stored in `MONGODB_URI` (local or Atlas) |
| **File storage** | Cloudinary | — | Profile pictures + leave supporting documents |
| **Email** | Brevo (optional) | — | Email notifications for leave status changes |
| **Push notifications** | Firebase (currently disabled in the client) | — | Not actively used; safe to skip for now |

Repository: `https://github.com/DanielPomboDev/smart-leave-mern` (branch `main`).

### Folder layout (read this before touching code)

```
smart-leave-mern/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/            # One file per page/module (e.g. HRLeaveRecord.jsx, MayorLeaveRequestDetails.jsx)
│   │   ├── services/              # API calls (api.js, mayorService.js, ...)
│   │   ├── App.jsx                # Routes for each user type
│   │   └── main.jsx
│   ├── vite.config.js             # Dev server on port 3000, proxies /api -> localhost:5000
│   └── package.json
├── server/                        # Node backend
│   ├── server.js                  # Entry point: Express app + route registration
│   ├── routes/                    # API route definitions
│   ├── controllers/               # Business logic (LeaveController, HRController, MayorController, LeaveRecordController, ...)
│   ├── models/                    # Mongoose schemas (User, LeaveRequest, LeaveRecord, Department)
│   ├── middleware/                # Auth, upload, validation
│   ├── config/                    # Cloudinary / email setup
│   ├── utils/ + templates/        # Email helpers and HTML templates
│   ├── create-all-users.js        # Seed script (default test accounts)
│   └── package.json
├── railway.toml                   # Backend deployment config (Railway)
└── HANDOVER.md                    # This file
```

**Workflow rule of thumb:** routes call controllers; controllers talk to models; the client calls `/api/...` through `client/src/services/*`. Most new features touch **one route file, one controller, one model (if new data), and one component**.

---

## 2. Prerequisites (install on each dev machine)

| Tool | Version | Why | Download |
|---|---|---|---|
| **Node.js** | **v20 LTS** (v18+ works; v24 tested) | Runs both server and build tooling | https://nodejs.org |
| **npm** | Ships with Node | Package manager | — |
| **MongoDB** | v6+ (v4.4+ works) | The database | https://www.mongodb.com/try/download/community |
| **MongoDB Compass** (optional) | any | GUI to inspect data — very handy | https://www.mongodb.com/products/compass |
| **Git** | any recent | Cloning the repo | https://git-scm.com |
| **VS Code** (recommended) | any | Editing | https://code.visualstudio.com |

Verify after installing:

```bash
node --version   # v20.x
npm --version    # 10.x
mongod --version # v6.x (or check the MongoDB service is running)
git --version
```

---

## 3. Step 1 — Get the code

The current owner will transfer the repo to the LGU (see **Section 7**). Once you have access:

```bash
git clone https://github.com/<lgu-org>/smart-leave-mern.git
cd smart-leave-mern
```

If the repo is still under the original owner's account and they only added you as a collaborator, clone that URL instead.

---

## 4. Step 2 — Install and start MongoDB

You have three options. **Option A is fastest for a single dev machine.**

### Option A — Local MongoDB (recommended for development)

1. Install MongoDB Community Server.
2. On Windows the installer normally registers it as a service (running automatically). Verify:
   ```bash
   netstat -an | findstr 27017     # you should see a LISTENING entry
   ```
3. The app defaults to `mongodb://localhost:27017/smartleave` — nothing else to configure.

### Option B — MongoDB Atlas (free tier)

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Add your IP to **Network Access**.
3. Copy the connection string (`mongodb+srv://<user>:<pass>@<cluster>/smartleave`).
4. Put it in `server/.env` as `MONGODB_URI` (Section 5).

### Option C — Use the existing production database (read this before choosing)

The live system's data (users, leave requests, records) lives in the current MongoDB instance. Options:
- **Take a dump and import it locally** (recommended):
  ```bash
  mongodump --uri "<PRODUCTION_MONGODB_URI>" --out ./backup
  mongorestore --uri "mongodb://localhost:27017" --nsInclude "smartleave.*" ./backup
  ```
- Or just point your local `.env` `MONGODB_URI` at the production URI (read-only risk: you'd be developing against live data — **not recommended**).

---

## 5. Step 3 — Set up the backend (`server/`)

```bash
cd server
npm install
```

Create a file named **`.env`** in `server/` (it is git-ignored — never commit it). Copy this template and fill in real values:

```bash
# ===== REQUIRED =====
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartleave
JWT_SECRET=change-me-to-a-long-random-string

# Cloudinary — required for profile pictures & leave document uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ===== OPTIONAL (leave blank to disable) =====
# Email notifications (Brevo)
BREVO_API_KEY=
EMAIL_FROM=smartleave@example.com
# Used in email links
FRONTEND_URL=http://localhost:3000
```

> **⚠️ Critical gotcha:** the current `server/.env` shipped with `PORT=57645`. The frontend proxies `/api` to **port 5000**, so if `PORT` is anything else the app will break. For local development set **`PORT=5000`** (Railway overrides `PORT` itself in production, so this only matters locally).

**Where to get the secret values:**
- `JWT_SECRET` — generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Cloudinary keys — create a free account at https://cloudinary.com → Dashboard. **Without them, profile picture and leave-document uploads will fail** (that's where files are stored).
- Brevo — optional; leave blank and email notifications simply won't send (the app still works).
- The current owner has working values for all of these — ask them to share them (ideally via a password manager, not email/chat).

**Start the server:**

```bash
npm run dev        # development (auto-restarts on file changes via nodemon)
# or
npm start          # plain node, no auto-reload
```

You should see:
```
Connected to MongoDB
Server is running on port 5000
```

Test it: open `http://localhost:5000` in a browser → `{"message":"SmartLeave API is running"}`.

---

## 6. Step 4 — Set up the frontend (`client/`)

```bash
cd client
npm install
```

Create **`client/.env`** (optional for local dev — defaults work):

```bash
# Optional. If omitted, the app uses the Vite proxy to http://localhost:5000
VITE_API_URL=http://localhost:5000

# Firebase (push notifications) — currently disabled in the app, safe to skip
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_STORAGE_BUCKET=...
# VITE_FIREBASE_MESSAGING_SENDER_ID=...
# VITE_FIREBASE_APP_ID=...
# VITE_FIREBASE_MEASUREMENT_ID=...
# VITE_FIREBASE_VAPID_KEY=...
```

**Start the app:**

```bash
npm run dev        # starts Vite on http://localhost:3000
```

Open **http://localhost:3000** — you should see the SmartLeave login page ("San Julian, Eastern Samar LGU SmartLeave"). The dev server proxies `/api` calls to the backend on port 5000 automatically, so no extra config is needed.

---

## 7. Step 5 — Seed test accounts and log in

With **both servers running**, open a second terminal and seed the default users:

```bash
cd server
node create-all-users.js
```

This creates one department + four accounts (skip any that already exist):

| Role | User ID | Password |
|---|---|---|
| Employee | `EMP001` | `password123` |
| Department Admin | `DA001` | `password123` |
| HR Manager | `HR001` | `password123` |
| Mayor | `MA001` | `password123` |

Log in at http://localhost:3000 to verify each role's dashboard.

> **🔒 Security — do this first thing:** these are public default credentials. Before real use:
> 1. Change these passwords (via login → Profile → change password, or by creating real staff accounts).
> 2. Create real users in HR → **Employees** instead of relying on the seed accounts.
> 3. Do **not** commit real credentials to the repo.

---

## 8. Step 6 — Verify the full workflow

A quick smoke test that the whole stack works:

1. Log in as `EMP001` → **File Leave** (e.g., 1-day Vacation) → add a supporting document.
2. Log in as `DA001` → approve/recommend it.
3. Log in as `HR001` → verify credits and approve.
4. Log in as `MA001` → final approve.
5. Log in as `EMP001` → confirm the request shows **Approved**, the leave record shows the deduction, and **View CS Form 6** renders (signature drawing + upload).

---

## 9. Transferring the repository to the LGU

Three options, in order of preference:

### Option A — Transfer ownership (keeps all history) ★ recommended
1. GitHub → repo → **Settings → General → Danger Zone → Transfer ownership**.
2. Enter the LGU's GitHub org/account (create one, e.g. `lgusanjulian-it`).
3. Confirm. The repo moves with full history, issues, and the remote URL updates automatically — everyone re-clones from the new URL.

### Option B — Add collaborators (repo stays with you)
1. **Settings → Collaborators → Add people** with the IT team's GitHub accounts (grant **Write**).
2. Simpler, but the repo remains under your personal account — if you leave, access needs to be re-granted.

### Option C — Fork (IT maintains their own copy)
1. LGU IT forks the repo into their org and develops there.
2. Loses the connection to your future changes; only recommended if you want to fully hand off responsibility.

**Along with the code, hand over (never via git or email):**
- `server/.env` and `client/.env` values (or create fresh ones and share via a password manager — Bitwarden/1Password shared vault).
- The production `MONGODB_URI` (or a `mongodump` backup) if they need the real data.
- Cloudinary dashboard login (for uploads) and Brevo login (if email is used).

---

## 10. Adding features — developer cheat sheet

**Stack conventions to follow:**
- Backend is **CommonJS** (`require`/`module.exports`), frontend is **ES modules**.
- New API endpoints: add a route in `server/routes/`, logic in `server/controllers/`, validation in `server/middleware/`.
- New data: add a schema in `server/models/` (register it in `server/models/index.js` if there is one).
- New pages: add a component in `client/src/components/` and a route in `client/src/App.jsx`.
- API calls from the client go through `client/src/services/` (axios, base URL from `VITE_API_URL` or the Vite proxy).
- Tailwind/daisyUI for styling — reuse existing classes rather than writing raw CSS.

**Local dev workflow:**
1. Start MongoDB.
2. `cd server && npm run dev` (auto-reloads on save).
3. `cd client && npm run dev` (Vite hot-reloads on save).
4. Both servers must run **simultaneously** — use two terminals.

**Useful debug scripts (run from `server/`):**
```bash
node check-users.js           # list all users
node list-users.js            # list users with roles
node create-user.js           # create a single user (edit file first)
```

---

## 11. Production deployment (when ready)

The repo already contains `railway.toml` for the backend:

- **Backend:** connect Railway to the repo → it runs `cd server && npm start` and provides `PORT` + your env vars automatically.
- **Frontend:** build with `cd client && npm run build`, deploy the `dist/` folder (Vercel/Netlify), and set `VITE_API_URL` to the deployed API URL.
- CORS already allows the deployed Vercel URL (`https://smart-leave-mern.vercel.app`) and any `*.vercel.app` domain.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login page loads but requests fail / blank data | Server not running, or wrong `PORT` | Check `server/.env` has `PORT=5000`; server terminal shows "Server is running on port 5000" |
| `ECONNREFUSED` on port 27017 | MongoDB not installed/running | Install MongoDB, start the service, verify with `netstat -an \| findstr 27017` |
| Signature image upload says "failed to upload" | JSON body limit (already raised to 10 MB) or file > 5 MB | Use a smaller image; check Cloudinary keys are set |
| Profile picture / document uploads fail | Cloudinary keys missing or wrong | Fill `CLOUDINARY_*` in `server/.env`, restart server |
| Port 3000 or 5000 already in use | Another process running | `netstat -ano \| findstr :3000`, kill the PID, or change `PORT` in both places |
| Frontend can't reach API from another machine | Vite proxy only works on localhost | Set `VITE_API_URL` to the machine's LAN IP and add that origin to CORS in `server.js` |

---

## 13. Handover checklist

- [ ] Repo transferred / collaborators added; IT has clone access
- [ ] `server/.env` created with `PORT=5000`, `MONGODB_URI`, `JWT_SECRET`, Cloudinary keys
- [ ] `client/.env` created (optional locally)
- [ ] MongoDB running; seed script run (`node create-all-users.js`)
- [ ] Both servers start and login works for all 4 roles
- [ ] Full leave workflow verified (Section 8)
- [ ] Default passwords changed / real accounts created
- [ ] Secrets shared securely (password manager), never in the repo
- [ ] Data backup (`mongodump`) handed over if production data is needed
