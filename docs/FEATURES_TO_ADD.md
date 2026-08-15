# SmartLeave — Features to Add (CSC Compliance Backlog)

A prioritized list of features and fixes needed to bring SmartLeave fully in line with the
Philippine Civil Service Commission (CSC) rules on leave. Every item cites its legal basis,
describes what the system does today, and sketches what to build.

## Implementation status

**All 14 backlog items are implemented** (August 2026) and smoke-tested against the running
stack. **Wellness Leave (CSC MC No. 1, s. 2026) was added as a 17th leave type** — a brand-
new benefit issued after this backlog was written:

- **Wellness Leave** — 5 days/calendar year (non-cumulative, non-commutable, forfeited if
  unused); max 3 consecutive working days at a time; 5-day advance filing (MC No. 1,
  s. 2026); no vacation/sick credit deduction; HR usage tracker
  (`GET /api/leave-records/wellness-status`); selectable in both filing wizards, the
  quick-leave flow, CS Form 6, and all leave-type displays.

- **Tier 1** — Medical certificate for sick leave > 5 successive days (flagged at filing,
  enforced at HR approval with an audited HR waiver); required supporting documents per
  leave type (approval blocked until attached or waived with a reason); statutory
  eligibility limits (paternity 4-delivery cap + 7 days, solo parent 7 days/year,
  maternity 105+30, study leave 180 days / 1-year service / once per school year).
- **Tier 2** — Half-day leave (filing, 0.5-day records, CS Form 6); mandatory 5-day
  forced-leave tracker (`GET /api/leave-records/forced-leave-status`); approval SLA
  surfaced on all approval screens (Sec. 49 deemed-approved notice); LWOP limits
  (> 1 month needs head-of-agency clearance, 1-year cap, both at HR approval); sick→
  vacation one-way draw (Sec. 56) when sick credits are exhausted.
- **Tier 3** — Automatic monthly accrual (`accrueCreditsUpTo` runs on server start and
  daily; `POST /api/leave-records/accrue` manual fallback); sick credits prorated on the
  same actual-service basis as vacation; actual-service refinements (illness vs non-
  illness LWOP, month-boundary overlap, mid-month hire proration, recompute-on-change
  after late without-pay approvals — manual records are never clobbered); part-time
  proportional credits (`part_time_weekly_hours` on the employee record, Sec. 2).
- **Tier 4** — SPL copy corrected (3 days/year, 1-week advance notice); sick-leave MC copy
  corrected to "five (5) successive days".

Remaining ideas not yet implemented (larger projects): a DTR/attendance module for AWOL
enforcement, and a gender field on the employee record to fully enforce the maternity/
paternity eligibility basis.

**Legal basis (section numbers refer to the Omnibus Rules on Leave, CSC MC No. 41, s. 1998):**

- Omnibus Rules on Leave — CSC MC No. 41, s. 1998 (amended Rule XVI of the Omnibus Civil Service Rules)
- RA 8187 — Paternity Leave Act (7 days, first 4 deliveries)
- RA 11210 — 105-Day Expanded Maternity Leave (2019)
- RA 8972 — Solo Parents' Welfare Act (7 days/year)
- RA 9262 — VAWC Act (10 days)
- RA 9710 — Magna Carta of Women (special leave benefits for women, 60 days)
- RA 11642 — Domestic Administrative Adoption Act (adoption leave)
- CSC MC No. 14, s. 1999 — study leave

> Note: the leave rules have been consolidated into the CSC's **2025 ORAOHRA**
> (MC No. 08, s. 2025); the rules themselves are unchanged from the Omnibus Rules on Leave.

---

## Summary

| # | Feature / fix | Legal basis | Tier | Effort |
|---|---|---|---|---|
| 1 | Enforce medical certificate for sick leave ≥ 5 successive days | Sec. 53 | 1 | S |
| 2 | Enforce required supporting documents per leave type | Secs. 53, 55 + special laws | 1 | S |
| 3 | Enforce statutory eligibility limits (paternity/maternity/solo parent/study) | Sec. 19, RA 8187, RA 11210, RA 8972, MC 14 s. 1999 | 1 | M |
| 4 | Half-day leave (filing + CS Form 6) | Sec. 28 | 2 | M |
| 5 | Mandatory 5-day forced leave tracking | Sec. 25 | 2 | M |
| 6 | Approval SLA — deemed approved after 5 working days | Sec. 49 | 2 | M |
| 7 | LWOP limits — 1-year cap + head-of-agency clearance | Secs. 57, 62 | 2 | M |
| 8 | Sick → vacation cross-pool draw (one-way) | Sec. 56 | 2 | S |
| 9 | Automatic monthly credit accrual | Secs. 27, 28 | 3 | M |
| 10 | Prorate sick credits (not just vacation) | Secs. 27, 28 | 3 | S |
| 11 | Refine actual-service computation (illness LWOP, mid-month hires, AWOL) | Secs. 28, 63 | 3 | M |
| 12 | Part-time proportional credits | Sec. 2 | 3 | S |
| 13 | Fix special privilege leave copy (3 days, 1-week notice) | Sec. 21 | 4 | XS |
| 14 | Fix sick-leave medical certificate copy ("5 successive days") | Sec. 53 | 4 | XS |

Tiers: **1** = enforce rules the UI already claims to handle (biggest compliance win, smallest change);
**2** = missing CSC features; **3** = credit-accrual correctness & automation; **4** = text corrections.

---

## Tier 1 — Enforce rules that already exist in the UI

### 1. Medical certificate for sick leave ≥ 5 successive days (Sec. 53)

- **Rule:** *"Application for sick leave in excess of five (5) successive days shall be accompanied by a proper medical certificate."*
- **Current behavior:** filing and approval never check the duration against a medical certificate; HR can approve any sick leave with no attachment. The UI even states the **wrong** threshold — *"Medical certificate (for absences of more than one day)"* instead of 5 successive days.
- **What to build:**
  - Flag sick-leave requests of 6+ successive days and require an uploaded medical certificate before HR/Mayor approval.
  - Block approval (with a documented HR override + reason, kept in the audit log).
  - Correct the UI copy (see item 14).

### 2. Required supporting documents per leave type

- **Rule:** various issuances require documents, e.g. maternity (MAT-1 / birth certificate), paternity (marriage certificate), solo parent (Solo Parent ID), VAWC (Barangay Protection Order / court order), special leave benefits for women (medical certificate), rehabilitation leave (*"supported by the proper medical certificate and evidence showing that the wounds or injuries were incurred in the performance of duty"* — Sec. 55).
- **Current behavior:** the request forms list these documents, but uploads are optional — HR can approve with **zero attachments**.
- **What to build:**
  - Per-leave-type required-document checklist enforced at the HR/Mayor approval step (missing documents shown as blocking).
  - HR override with a reason, recorded in the audit log.

### 3. Statutory eligibility limits

- **Rule:**
  - **Paternity:** 7 working days, **for the first four (4) deliveries** only (Sec. 19 / RA 8187); non-cumulative, non-commutable (Sec. 20).
  - **Maternity:** per pregnancy (Sec. 13), 105 days under RA 11210 (60 under the old rule), plus the 30-day unpaid extension option.
  - **Solo parent:** 7 days per year (RA 8972).
  - **Study leave:** 6 months (180 days), requires at least one (1) year of service, with a return-service obligation (CSC MC No. 14, s. 1999).
- **Current behavior:** none of these are validated — any employee can file any of these types any number of times.
- **What to build:** server-side checks on filing (and re-checks at approval):
  - Paternity: track deliveries per employee; block beyond 4.
  - Solo parent: track days used within the calendar year; block beyond 7.
  - Study leave: verify 1-year service, cap at 180 days, record the return-service commitment.
  - Maternity: enforce once per pregnancy, 105 days + 30-day unpaid extension.
  - All overrides require an approving authority and are audited.

---

## Tier 2 — Missing CSC features

### 4. Half-day leave (Sec. 28)

- **Rule:** *"A fraction of one-fourth or more but less than three-fourths shall be considered as one-half day and a fraction of three-fourths or more shall be counted as one full day."*
- **Current behavior:** leave filing is date-range only — whole working days. CS Form 6 has a "half day" option that can never be produced by the data.
- **What to build:** half/full-day picker per date in the filing wizard; fractional day counts in leave records and balances; CS Form 6 rendering of 0.5-day entries; undertime conversion still whole-day only.

### 5. Mandatory 5-day forced leave (Sec. 25)

- **Rule:** all employees with **10 days or more** accumulated vacation leave must take a minimum of **5 working days** forced/mandatory leave per year (continuous or intermittent). Forfeited if not taken that year, with exceptions: retirement/resignation mid-year, and leave cancelled in the exigency of the service.
- **Current behavior:** "Forced Leave" exists as a selectable leave type, but nothing tracks eligibility, usage, or forfeiture — anyone can file it, and nobody is ever required to.
- **What to build:**
  - HR tracker: who is eligible (≥ 10 days VL balance), who has taken their 5 days, who must forfeit.
  - Balance-based eligibility check at filing.
  - Year-end forfeiture job (marks the forfeited days, adjusts balances) with the Sec. 25 exceptions handled.
  - Optional reminders to employees/HR before year-end.

### 6. Approval SLA — deemed approved after 5 working days (Sec. 49)

- **Rule:** *"Whenever the application for leave of absence ... is not acted upon by the head of agency or his duly authorized representative within five (5) working days after receipt thereof, the application for leave of absence shall be deemed approved."*
- **Current behavior:** no timer — a request can sit at any approval stage indefinitely with no consequence.
- **What to build:**
  - Record receipt date at each approval stage; show "days since received" to approvers.
  - Escalation/reminder for requests approaching 5 working days.
  - Optionally: a configurable auto-approve (with a loud audit trail) or at minimum an explicit flag that a request is past SLA, so the agency can act consistently with Sec. 49.

### 7. LWOP limits (Secs. 57, 62)

- **Rule:** leave without pay may not exceed **one (1) year**; LWOP in excess of **one (1) month** requires the clearance of the head of agency. Failure to report after one year of LWOP = automatic separation (Sec. 62).
- **Current behavior:** `lwop_days` is tracked on records, but no cumulative limit or clearance workflow exists.
- **What to build:**
  - Per-employee, per-year cumulative LWOP counter.
  - Clearance workflow when a request pushes cumulative LWOP past one month.
  - Hard block (exceptional-case flag + approving authority) beyond one year.

### 8. Sick → vacation cross-pool draw (Sec. 56)

- **Rule:** *"When an employee had already exhausted his sick leave credits, he can use his vacation leave credits but not vice versa."*
- **Current behavior:** sick leave with exhausted sick credits goes straight to without-pay (or is denied); the one-way draw from vacation is never offered.
- **What to build:** at filing (or HR approval) for sick leave with 0 sick credits remaining, offer to charge against vacation credits; flag the record so it is labeled correctly on CS Form 6 and in reports.

---

## Tier 3 — Credit accrual correctness & automation (Secs. 27, 28)

### 9. Automatic monthly credit accrual

- **Rule:** credits accrue on **actual service** — 1 day VL + 1 day SL per 24 days of service (monthly: 1.25 + 1.25 via the CSC table).
- **Current behavior:** accrual is a **manual HR action** — "Calculate Credits" runs a one-off batch per month/year. If HR forgets to click, nobody accrues that month. No scheduler exists.
- **What to build:**
  - Idempotent `accrueCreditsUpTo(now)` routine: runs on server start and daily (or via a Render cron ping), accrues every not-yet-calculated month, marks months done.
  - **Recompute-on-change:** if a without-pay approval lands late (e.g., May's LWOP approved in July), that month's record is recalculated, with the change in the audit log.
  - Keep the manual "Calculate Credits" and `add-credits` override as an audited fallback for corrections.

### 10. Prorate sick credits too

- **Rule:** both VL and SL are earned on actual service (Secs. 27, 28).
- **Current behavior:** sick credits are hard-coded to 1.250 per month and **never prorated** — an employee with 20 days of unpaid leave still earns the full SL.
- **What to build:** apply the same actual-service proration table to SL as to VL.

### 11. Refine actual-service computation (Secs. 28, 63)

- **Rule:** LWOP for any reason **other than illness** does not count as service (illness LWOP does). Absence without approved leave is unauthorized (Sec. 50) and 30+ continuous days = AWOL/separation (Sec. 63).
- **Current behavior:** LWOP detection only sees approved-without-pay requests whose **start date** falls in the month. It misses:
  - LWOP spilling into the following month,
  - mid-month hires/transfers (a hire on July 20 still earns a full month of credits),
  - unauthorized absences (AWOL),
  - the **illness vs. non-illness** distinction (unpaid sick leave counts as service; the system prorates it away like any other LWOP — and conversely non-illness LWOP should reduce SL too, which it doesn't).
- **What to build:**
  - Split illness vs. non-illness LWOP by leave type.
  - Count LWOP across month boundaries.
  - Prorate for the actual appointment date (needs an appointment/start date on the employee record).
  - AWOL detection is **deferred** — it requires a DTR/attendance feed (see below).

### 12. Part-time proportional credits (Sec. 2)

- **Rule:** part-time employees earn leave proportionally — e.g., 20 hours/week = **7.5 VL + 7.5 SL** per year.
- **Current behavior:** no part-time flag exists on the employee record; everyone accrues the full-time rate.
- **What to build:** a part-time flag (with weekly hours) on the employee record, and proportional accrual.

---

## Tier 4 — Text & UX corrections

### 13. Special privilege leave copy (Sec. 21)

- **Rule:** SPL is a maximum of **three (3) days per calendar year**, applied for **at least one (1) week** before availment (except emergencies); non-cumulative, non-commutable.
- **Current behavior:** the UI copy describing SPL needs to state the 3-day annual limit and the 1-week notice requirement.

### 14. Sick-leave medical certificate copy (Sec. 53)

- **Rule:** medical certificate required for sick leave **in excess of 5 successive days**.
- **Current behavior:** the UI says *"Medical certificate (for absences of more than one day)"* — wrong threshold.
- **Fix:** change the copy to reflect "5 successive days".

---

## Suggested order of work

1. **Phase 1 — Compliance enforcement (Tier 1 + Tier 4).** No new UI surface; blocks the worst audit findings (approving a 6-day sick leave with no MC, zero-document approvals, unlimited paternity).
2. **Phase 2 — Missing features (Tier 2).** Half-day filing, forced-leave tracker, approval SLA, LWOP limits, sick→vacation draw.
3. **Phase 3 — Accrual automation (Tier 3).** Automatic monthly accrual + proration fixes, so credits can't silently lapse or miscompute.

## Deferred — needs external input

- **DTR / attendance module** — required for AWOL enforcement (Sec. 63), exact-hours deduction (Sec. 30), and day-level presence. Until then, the system runs the sanctioned "present unless a documented leave says otherwise" model, which the CSC computation table supports.
- **Part-time hours data** — needs HR to maintain appointment type / weekly hours on employee records.

---

*Generated from a review of the SmartLeave codebase against the CSC rules on leave (see conversation history for the full comparison).* 
