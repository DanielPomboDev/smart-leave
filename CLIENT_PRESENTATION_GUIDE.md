# SmartLeave — Client Presentation Guide

**System:** SmartLeave — LGU Leave Management System
**Client:** LGU San Julian, Eastern Samar
**Stack:** MERN (MongoDB, Express, React, Node.js)

This guide is a complete walkthrough for presenting and demoing the system to the client — from preparation, to the click-by-click demo script, to handling questions. It is written so that anyone (developer, project lead, or even an HR person who knows the system) can run the presentation.

---

## 1. Before the Presentation — Checklist

### 1.1 Environment check (do this the day before, then again 1 hour before)

- [ ] **Backend running** — Node server on `http://localhost:5000`
- [ ] **Frontend running** — React dev server on `http://localhost:3000`
- [ ] **MongoDB connected** — app loads without errors
- [ ] **Backup the database** before the demo: `mongodump --db smartleave -o ./backup-demo`
- [ ] Log in with **all four demo accounts** once to make sure none are locked or broken
- [ ] Check the **console** (F12 → Console) for errors on each main page
- [ ] Test **printing** a CS Form 6 once (make sure a PDF printer is available if you'll demo it)
- [ ] Have **two browser windows** ready (or incognito) so you can switch roles instantly without logging out

### 1.2 Demo accounts (put these on a slide or printed card)

| Role | User ID | Password |
|---|---|---|
| Employee | `EMP001` | `password123` |
| Department Admin | `DA001` | `password123` |
| HR Manager | `HR001` | `password123` |
| Mayor | `MA001` | `password123` |

> ⚠️ Change nothing in production data. If the client asks "can we add a record?", say yes — but on the demo dataset, not real records.

### 1.3 Prepare test data (so the demo never dead-ends)

Before the presentation, make sure the demo database has:

- [ ] **Leave requests in every status:** at least one `pending`, one `recommended`, one `hr_approved`, one `approved`, and one `cancelled`
- [ ] **A leave record** for EMP001 with entries: monthly earned credits, an approved leave deduction, an undertime row, and a manual credit adjustment
- [ ] **A holiday** with a statutory entitlement (e.g., "Ninoy Aquino Day — Special Non-Working")
- [ ] **A CS Form 6** where signatures (employee + HR) are already drawn/uploaded, so the form shows them instantly
- [ ] **One signed PDF** ready to upload for the PNPKI segment (optional but powerful)
- [ ] **A team calendar** with a few visible leave chips

### 1.4 Physical setup

- Projector / TV with a decent resolution (the app is responsive, but present on desktop)
- Internet or a shared folder for the handover materials (README, this guide, credentials doc)
- Phone or tablet ready — **the app is mobile-responsive**, and showing it on a phone is a strong "wow" moment at the end
- A glass of water. Demos get long.

---

## 2. Know Your Audience

Different people in the room care about different things. Read the room and shift your emphasis:

| Person in the room | What they care about | Emphasize |
|---|---|---|
| **Mayor** | Control over final approval, no paper piles, accountability | Mayor's final-approval step, approval trail, reports |
| **HR Officer** | Less manual work, accurate credits, official forms | Leave records ledger, CS Form 6, credits computation, audit trail |
| **Department Heads** | Quick recommendation, seeing their staff | Department recommendation step, team calendar |
| **Employees** | Convenience, transparency of their balance | Request Leave, My Leave Record, notifications |
| **IT / Admin** | Hosting, security, backups, who manages accounts | Cloudinary storage, role-based access, deployment guide |

**Golden rule:** always show the mayor's step with the mayor, the HR step with HR, etc. Never present a feature from the wrong role's perspective.

---

## 3. Suggested Run of Show (45–60 minutes)

| # | Segment | Time |
|---|---|---|
| 1 | Opening — the problem | 5 min |
| 2 | Solution overview — what the system does | 5 min |
| 3 | Live demo — the full leave lifecycle | 30–40 min |
| 4 | Digital signature / PNPKI story | 5 min |
| 5 | Closing — hosting, training, next steps | 5–10 min |
| 6 | Q&A | as needed |

---

## 4. The Demo Script (click-by-click)

> Open `http://localhost:3000` and land on the login page before you start talking.

### Segment A — Opening (5 min): The problem

Tell the story *they* live every day:

1. **Before SmartLeave:** leave requests are paper forms shuttled between desks; the HR officer manually copies approved leaves into leave cards; credits are computed by hand with a calculator; disputes happen because nobody can verify a balance; finding a form from last year means digging through a cabinet.
2. **The cost:** time, errors, lost documents, and no visibility for the employee or the Mayor.
3. **The promise:** one system that takes a leave request from submission to Mayor's approval, automatically builds the official leave record and CS Form 6, and gives every employee visibility into their own credits.

> Do not demo yet. Set the stage first — the demo is much stronger when they've already felt the pain.

### Segment B — Solution overview (5 min): One slide, one walk

Show the four roles and their path through one leave request:

```
Employee submits → Department Head recommends → HR approves → Mayor gives final approval → Leave record is created automatically
```

Point out (briefly — details come in the demo):
- **Every employee** gets a dashboard with their balance, notifications, and a one-click request form
- **HR** gets the full records system: leave cards, credits, undertime, holidays, reports, audit trail
- **Mayor** gets final approval control with a full audit trail
- **The CS Form 6** is generated digitally — no more retyping the official form

### Segment C — The live demo (30–40 min)

#### Step 1: Employee journey — log in as `EMP001`

1. Log in with **EMP001 / password123**.
2. **Dashboard** (`/employee/dashboard`) — point out:
   - The welcome header and **leave balance cards** (Vacation / Sick)
   - **Pending requests** panel and **notifications** bell (top right)
3. **Request Leave** (`/employee/request-leave`) — *file a real request*:
   - Pick a leave type (e.g., Vacation Leave)
   - Dates, number of days, **with/without pay**, where spent
   - Upload a **supporting document** if you have one ready (e.g., a medical certificate image)
   - Submit → **"Leave request submitted successfully"**
4. **Leave History** — show the new request sitting at **"Pending"**.
5. Open the request → point out the **Cancel** option is available (employee can cancel while pending).
6. **My Leave Record** (`/employee/my-leave-record`) — this is a *big selling point*:
   - The official ledger view: monthly earned credits, used credits, undertime, running balance
   - Say: *"Every employee can now see exactly how their 15-day monthly grant is earned and spent — no more 'trust me, that's your balance.'"*

> 🎬 **Transition line:** *"The request is now sitting with the Department Head. Let's switch to her screen."*

#### Step 2: Department Admin — log in as `DA001`

1. Log out, log in as **DA001 / password123**.
2. **Leave Requests** (`/department/leave-requests`) — show the queue.
3. Open EMP001's request → **Recommend / Disapprove**.
4. Click **Recommend** → status becomes **"Recommended"**.
5. Briefly show the **Leave Calendar** (`/department/calendar`) — the team's leaves at a glance (nice for department heads).

> 🎬 **Transition line:** *"Recommended. Now it's in HR's hands."*

#### Step 3: HR Manager — log in as `HR001`

1. Log in as **HR001 / password123**.
2. **Leave Requests** (`/hr/leave-requests`) — show the HR queue (all departments).
3. Open EMP001's request → **Approve**.
   - Because it's **with pay**, the approval screen asks HR to **certify the leave credits** — check the box (this is the "green box" attestation on the form).
   - Approve → status becomes **"HR Approved"**.
4. **The CS Form 6 moment** — from the request or leave record, click **View CS Form 6**:
   - Show the **official CSC form layout** — name, position, leave type, dates, where spent, commutation, without pay
   - Show the **signature block**: the employee's and HR officer's signatures are drawn/uploaded and appear right on the form
   - Show the **"Leave credits certified correct"** attestation
   - This is the wow moment: *"The official form is generated automatically — no more typing it by hand."*
5. **Leave Records** (`/hr/leave-records`) — the full ledger:
   - The **record for EMP001** — earned 15.000, used, running balance
   - Show **Add Record**, **Add Undertime**, **Add Credits** buttons (these are HR-only tools)
   - Point out: the ledger only contains leaves **approved by the Mayor**, and a cancelled-after-approval leave shows with a **Cancelled** badge rather than disappearing
6. **Holidays** (`/hr/holidays`) — show the holiday list and **statutory entitlements** (the special non-working days that earn credits automatically)
7. **Reports** (`/hr/reports`) — show the summary/breakdown screens
8. **Employees** (`/hr/employees`) — show how HR adds/edits employees, including **Appointment Status** (Permanent, Job Order, Casual, etc. — this drives the badge on the record)

> 🎬 **Transition line:** *"HR has approved. Now the final step — the Mayor."*

#### Step 4: Mayor — log in as `MA001`

1. Log in as **MA001 / password123**.
2. **Dashboard** — point out the overview stats (pending, approved this month, etc.).
3. **Leave Requests** (`/mayor/leave-requests`) — show the queue filtered to requests awaiting the Mayor.
4. Open EMP001's request → **Approve** → status becomes **"Approved"**.
5. **The payoff:** go back to HR (or the record) and show that **the leave record now has a new entry** for EMP001 — the approved leave automatically deducted the credit. Say:
   - *"The moment the Mayor approves, the system computes and records the deduction. No calculator, no retyping, no arithmetic errors."*
6. Optional twist (if time): show that if a request is **cancelled after approval**, it stays in the record with a **Cancelled badge** — so the history is never erased, just marked.

> 🎬 **Transition line:** *"That was the full lifecycle. Now the part that makes this a real LGU-grade system — the digital signature."*

#### Step 5: The digital signature & PNPKI story (5 min)

1. Open a **CS Form 6** again and point at the signature block:
   - **Employee signature** — drawn on a pad or uploaded image (show the Profile → signature area)
   - **HR signature** — same
2. **Print / Save PDF** button → opens a clean print preview where only the **official form** prints (no app UI leaks).
3. The **PNPKI workflow** (the DICT digital-signature path):
   - Export the form as PDF via the print dialog
   - Sign it in **Adobe Reader** with the DICT-issued **PNPKI certificate** (digital signature, not an image)
   - Upload the signed PDF back → the record shows a green **Signed PDF** button with who uploaded it and when
   - Say: *"This gives the LGU a cryptographically valid, legally recognized digital signature path — coordinated with DICT — while the internal drawing/uploading signatures keep the day-to-day workflow fast."*
4. **Audit trail** — show the audit log (who did what, when) if it's visible from the HR side. Say: *"Every approval is recorded. If anyone asks 'who approved this?', the answer is in the system."*

#### Step 6: The transparency close (2 min)

1. Log back in as **EMP001**.
2. Open **My Leave Record** again — now it shows the new deduction from the request we just processed.
3. Say: *"This is the difference. Before, employees had to ask HR 'how much leave do I have left?' Now they can check anytime, and HR's numbers and the employee's numbers will always match — because they're the same data."*

### Segment D — Closing (5–10 min)

1. **Responsive design:** open the app on a phone/tablet and show the hamburger menu. *"The system works on the office desktop, and employees can also use it on their phones."*
2. **Hosting & handover:**
   - The system runs on the LGU's own server (recommended: a VPS — the handover guide covers setup step by step)
   - Files are stored in **Cloudinary** (cloud storage), so no files are lost when the server is replaced
   - The **HANDOVER/README** documents cover setup, environment variables, and how to add features
3. **Training plan:** propose 2 half-day sessions — one for HR (records, forms, holidays, reports), one for everyone else (requesting leave, history, My Leave Record).
4. **Next steps / rollout:** ask about data migration (existing leave balances of employees need to be loaded as starting credits), who will be the system administrator, and when to start.

---

## 5. Feature → Benefit Cheat Sheet (for your own notes)

| Feature | Benefit to the LGU |
|---|---|
| Role-based approval chain (Employee → Dept Head → HR → Mayor) | Follows the existing approval culture; the Mayor always has final say |
| Auto-created leave records on Mayor approval | No manual ledger work; no arithmetic errors |
| 15-day monthly statutory credits + holiday entitlements | Matches CSC rules automatically |
| Undertime & manual credit adjustment (HR-only) | Flexible records handling, still controlled |
| My Leave Record for every employee | Transparency; fewer disputes; employees can verify balances |
| CS Form 6 generated digitally | No retyping the official form; consistent and official-looking |
| Signature block (draw/upload) + PNPKI signed-PDF upload | Internal speed + legally valid digital signatures via DICT |
| Supporting documents on requests | HR has the proof attached to the request itself |
| Cancelled-after-approval stays recorded with a badge | Honest audit history |
| Audit trail | Accountability for every approval |
| Notifications | Nobody misses a request waiting on them |
| Team calendar | Department heads see their staff's leaves at a glance |
| Reports | Monthly/annual reporting without spreadsheets |
| Responsive UI | Works on desktop and phones |
| Role-based access control (non-HR see only their own record) | Data privacy — required for a government system |

---

## 6. Likely Questions & Suggested Answers

**Q: "What happens to our existing leave cards and balances?"**
A: We migrate them once: HR enters each employee's current vacation/sick balance as starting credits, and the system continues from there. We'll do this together in the training session.

**Q: "Can an employee still take leave without pay?"**
A: Yes — the request form has a With/Without Pay option, and without-pay leaves are recorded but do not deduct credits.

**Q: "Who can change a leave record or add credits?"**
A: Only the HR role. Employees and department heads see their own record read-only. The Mayor can approve or disapprove requests but cannot edit records.

**Q: "Is our data safe? Where is it stored?"**
A: Files (signatures, documents, PDFs) go to Cloudinary, a secure cloud storage service. Login is password-protected with encrypted passwords, and each role only sees what it's allowed to. Backups are part of the server setup in the handover guide.

**Q: "Can this connect to DICT / PNPKI for digital signatures?"**
A: Yes — the PNPKI flow is built in: export the form as PDF, sign it in Adobe Reader with the DICT-issued certificate, and upload the signed copy back. It's stored with the record and is audit-ready. We recommend coordinating with the DICT regional office on certificate issuance and any API integration.

**Q: "What if we want to add features later?"**
A: The system is built to be extended — the handover guide documents the structure (React frontend, Node backend), and the LGU's IT can add features with our support.

**Q: "What happens if the server is down?"**
A: The system runs on your own server. If it's offline, nothing is lost — data is in MongoDB, and files are in Cloudinary. It comes back exactly where it was. (Recommend a simple backup schedule in the training.)

**Q: "How do employees without computer access request leave?"**
A: The system works on phones and tablets too — any employee with a smartphone can use it. For employees without any device, HR can file the request on their behalf (HR has Request Leave as well).

---

## 7. Demo Pitfalls & Recovery

| Risk | Prevention | Recovery |
|---|---|---|
| Server not running | Checklist in §1.1 | Restart backend + frontend; keep the commands printed on a card |
| Wrong demo account / locked account | Test all 4 accounts the day before | Use the seeded credentials; recreate the user if needed |
| Empty dashboard (no data) | Pre-seed test data (§1.3) | Show the "add record" / "request leave" flow live — it fills the screen naturally |
| CS Form 6 looks empty (no signatures) | Pre-draw signatures on the demo accounts | Open Profile → draw a quick signature live; it's actually a nice demo moment |
| Print dialog fails on the projector | Test printing beforehand | Skip to the Upload Signed PDF step and say "we'll show printing in the training" |
| Screen resolution too small on the projector | Present on desktop, not laptop HiDPI | Use browser zoom (Ctrl + / Ctrl −) |
| The Mayor's queue is empty | Pre-create a request at `hr_approved` | File a new request as HR001 first (auto-skips to mayor's queue) |
| Someone asks to see a feature you didn't prepare | — | Say "great question — let me show you right now" and demo it live; the system is fast enough |
| Demo data gets polluted (someone asks to try) | Have the mongodump backup from §1.1 | Restore with `mongorestore` after the demo |

---

## 8. After the Demo — What to Hand Over

Prepare a folder (USB or shared drive) with:

1. **This presentation guide** (`CLIENT_PRESENTATION_GUIDE.md`)
2. **The README** — setup on a local machine (install, env vars, run commands)
3. **The handover document** — full technical handover for the LGU IT (structure, deployment, hosting)
4. **A credentials sheet** — default demo accounts, and a note that all production passwords must be changed
5. **A short "user guide" one-pager** per role (Employee, Department Head, HR, Mayor) — 1 page each, screenshots + 5 steps
6. **A deployment plan** — recommended hosting (VPS), MongoDB backup schedule, domain/SSL, who administers accounts

Then agree on **next steps in writing**: data migration date, training dates, the system administrator, and a go-live date.

---

*End of guide — good luck, and remember: the best demos tell a story. One request, from submission to Mayor's approval, with the leave card updating itself at the end, is the whole pitch.*
