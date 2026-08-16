# SmartLeave — Leave Management System (MERN)

A web-based leave management system for **LGU San Julian, Eastern Samar**. Employees
file leave requests, department heads recommend them, HR verifies credits and
documents, and the mayor gives final approval — all with automatic leave-record
accounting and official **CS Form No. 6** generation.

Built with the **MERN** stack: **MongoDB, Express.js, React, Node.js**.

> This is a complete, independent copy of the SmartLeave source code. It contains
> **no production data and no secrets** — the database password, JWT secret, and
> Cloudinary keys live only in the donor's deployment dashboards. You create your
> own database and accounts during setup (see [Setup](#setup--run-on-localhost)).
> For an LGU handover summary, see **`docs/FEATURES_TO_ADD.md`** and the feature
> list below.

---

## Features

- **4 user roles** with separate dashboards: Employee, Department Admin (Head),
  HR Manager, and Mayor.
- **17 leave types**, each CSC-compliant: Vacation, Sick, Mandatory/Forced,
  Maternity, Paternity, Special Privilege, Solo Parent, Study, 10-Day VAWC,
  Rehabilitation Privilege, Special Leave Benefits for Women, Special Emergency
  (Calamity), Adoption, **Wellness Leave (CSC MC No. 1, s. 2026)**, Others
  (specify), Monetization of Leave Credits, and Terminal Leave.
- **Approval chain** — Department Head → HR → Mayor — with the **Sec. 49 SLA**:
  a request unacted within **5 working days** is deemed approved (SLA banner on
  every approval screen).
- **Automatic monthly credit accrual** — 1.25 VL + 1.25 SL per month of actual
  service, prorated for LWOP and mid-month hires via the CSC table, proportional
  for part-time employees (Sec. 2), and idempotent (never double-credits).
- **Half-day leave (Sec. 28)** — filed as 0.5 day, rendered as "½ day" on CS Form 6.
- **Compliance enforcement** — medical certificate for sick leave over 5 days
  (Sec. 53), per-type supporting documents with audited waivers, statutory limits
  (maternity 105 days, paternity 4 deliveries, study leave 180 days, wellness
  5 days/year, etc.), LWOP clearance (Sec. 57), and the sick→vacation draw (Sec. 56).
- **Official CS Form No. 6** (Application for Leave, Revised 2020) with embedded
  digital signatures (draw or upload) and signed-PDF upload for the permanent record.
- **Leave Records** — monthly ledgers with earned/used/balance, undertime, manual
  corrections (never overwritten by the automatic job), audit trail, and the
  Wellness + Mandatory Forced-Leave trackers.
- **Reports & CSV export** — department breakdown and employee ledger.
- **Leave calendar & holidays** — month grid, "Who's On Leave", recurring/one-off
  holidays (including Local Holiday / Special Working day handling).
- **Notifications** — bell with unread badge, full inbox page (filters, pagination,
  delete, mark-read, click-to-open the request), plus optional **email copies** (Brevo).
- **Security** — JWT auth, role-based authorization, rate-limited login, hardened
  headers (helmet + CSP).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS, daisyUI, React Router 7 |
| Backend | Node.js, Express 5, Mongoose (MongoDB ODM) |
| Database | MongoDB |
| File storage | Cloudinary (profile pictures, leave documents, signatures) |
| Notifications | Email via Brevo (optional) |

## Project Structure

```
smart-leave/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/            # One file per page/module
│   │   ├── services/              # API calls
│   │   ├── App.jsx                # Routes for each user type
│   │   └── main.jsx
│   ├── vite.config.js             # Dev server on port 3000; proxies /api -> localhost:5000
│   └── package.json
├── server/                        # Node backend
│   ├── server.js                  # Entry point: Express app + route registration
│   ├── routes/                    # API route definitions
│   ├── controllers/               # Business logic (Leave, HR, Mayor, LeaveRecord, ...)
│   ├── models/                    # Mongoose schemas (User, LeaveRequest, LeaveRecord, ...)
│   ├── middleware/                # Auth, upload, validation
│   ├── config/ + utils/           # Cloudinary, email, CSC rules helpers
│   ├── create-all-users.js        # First-run seed script (creates department + 4 accounts)
│   └── package.json
├── render.yaml                    # Backend deployment config (Render)
└── docs/                          # Feature notes
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | **v20 LTS** (v18+ works, v24 tested) | Includes npm |
| [MongoDB](https://www.mongodb.com/try/download/community) | v6+ (v4.4+ works) | Community Server, or MongoDB Atlas free tier |
| [Git](https://git-scm.com) | any recent | Clone the repo |

> **Internet note:** the one-time steps (`npm install`, creating a free Atlas
> account) need an internet connection — do them once on a machine with good
> internet; afterwards the system runs fully on the office network.

---

## Setup — Run on Localhost

### Step 1. Get the code

```bash
git clone <repository-url>
cd smart-leave
```

### Step 2. Start MongoDB

**Option A — Local MongoDB (recommended for development)**

Install MongoDB Community Server. On Windows it registers as a service
automatically; verify it's listening:

```bash
# Windows
netstat -an | findstr 27017
# macOS / Linux
netstat -an | grep 27017
```

The app connects to `mongodb://localhost:27017/smartleave` by default — no
configuration needed.

**Option B — MongoDB Atlas (free tier)**

1. Create a free cluster at https://www.mongodb.com/atlas
2. Whitelist your IP under **Network Access**
3. Copy the connection string and use it as `MONGODB_URI` in Step 3

### Step 3. Set up the backend

```bash
cd server
npm install
```

Create a file named **`.env`** inside `server/` (git-ignored — never commit it):

```bash
# ===== REQUIRED =====
# Must be 5000 for local development (the frontend proxy expects it)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartleave
JWT_SECRET=change-me-to-a-long-random-string

# Cloudinary — required for profile picture, signature & leave document uploads
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

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create a free Cloudinary account at https://cloudinary.com and copy the API keys
from the Dashboard. **Without them, uploads fail — everything else still works.**

Start the backend:

```bash
npm run dev     # development — auto-restarts on file changes
# or
npm start       # plain node, no auto-reload
```

You should see `Connected to MongoDB` and `Server is running on port 5000`.
Verify at http://localhost:5000.

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

Open **http://localhost:3000** — the Vite dev server proxies `/api` calls to the
backend on port 5000. **Both servers must run at the same time (two terminals).**

### Step 5. Create the first accounts

```bash
cd server
node create-all-users.js
```

This creates one department and four accounts (existing users are skipped).
Every account uses the default password **`password123`**:

| Role | User ID | Password |
|---|---|---|
| Employee | `EMP001` | `password123` |
| Department Admin | `DA001` | `password123` |
| HR Manager | `HR001` | `password123` |
| Mayor | `MA001` | `password123` |

Log in as `HR001` first, then add your real staff under **Employees**.
Accounts created by HR are forced to change their password on first login.

> **Security:** these are default credentials for initial setup only. Change the
> passwords on first login and never commit real credentials to the repo.

---

## Security Checklist (before deploying)

- `server/.env` and `client/.env` are git-ignored — never commit them. Use the
  `.env.example` templates and generate a strong `JWT_SECRET` (the server refuses
  to start without one).
- Keep dependencies patched: `cd server && npm audit` and `cd client && npm audit`.
- Login is rate-limited (20 attempts / 15 min / IP) and the API sets hardened
  headers (helmet + CSP).

---

## Deploying Your Own Cloud Instance (optional)

If you want the office to access the system from any device (not just one PC):

1. **MongoDB Atlas** — create a free M0 cluster, a database user, and allow
   `0.0.0.0/0` under Network Access. Copy the connection string.
2. **Render (backend)** — create a free account, **New → Web Service → connect
   this GitHub repo**, root directory `server`, build `npm install`, start
   `npm start`. Set the environment variables from Step 3 (including the Atlas
   `MONGODB_URI`). You get an API URL like `https://yourapp.onrender.com`.
3. **Vercel (frontend)** — create a free account, **Add New → Project → connect
   this repo** (framework: Vite), set `VITE_API_URL` to your Render URL, deploy.
4. Run `create-all-users.js` once against the Atlas database (or register users
   through the HR account after first login).
5. `render.yaml` in the repo root is the Render blueprint; `client/vercel.json`
   holds the Vercel config — both are picked up automatically when you connect
   the repo.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Pages load but no data / requests fail | Server not running, or wrong `PORT` | Check `server/.env` has `PORT=5000` |
| `ECONNREFUSED` on port 27017 | MongoDB not running | Install/start MongoDB; `netstat -an \| findstr 27017` (Windows) |
| Signature / document uploads fail | Cloudinary keys missing or wrong | Fill `CLOUDINARY_*` in `server/.env` and restart |
| Web shows API errors after deploy | Wrong `VITE_API_URL` | Set it to the deployed API URL and rebuild |
| Can't log in | Accounts are created by HR only | Run `node create-all-users.js` first, then add staff via HR |
| Forgot a password | No self-service reset | Ask HR — accounts are managed in **Employees** |

---

## License

Private project for LGU San Julian — internal use.
