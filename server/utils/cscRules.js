// Central CSC compliance helpers — Omnibus Rules on Leave (CSC MC No. 41, s. 1998),
// RA 8187, RA 11210, RA 8972, RA 9262, RA 9710, RA 11642, CSC MC No. 14 s. 1999.
// Single source of truth for the rules enforced across filing, approval, and accrual.

// Leave types that draw from vacation credits (mirrors LeaveRecordController.getLeaveCreditsInfo)
const VACATION_POOL_TYPES = [
  'vacation', 'special_privilege_leave', 'study_leave',
  'mandatory_forced_leave', 'monetization', 'terminal_leave'
];
const SICK_POOL_TYPES = ['sick'];

// Leave types that count as "illness" for actual-service purposes (Sec. 28):
// leave without pay for reasons other than illness does not count as service,
// but unpaid sick leave does.
const ILLNESS_LEAVE_TYPES = ['sick'];

// Required supporting documents per leave type (CS Form No. 6 practice + special laws)
const REQUIRED_DOCUMENTS = {
  sick: ['Medical certificate (required for absences in excess of five (5) successive days — Sec. 53)'],
  mandatory_forced_leave: ['Official directive or memorandum from the head of office'],
  maternity_leave: ['Maternity notification form (MAT-1)', 'SSS documents (if applicable)'],
  paternity_leave: ['Marriage certificate', 'Birth certificate of the child'],
  special_privilege_leave: ['Certification of eligibility from the head of agency'],
  solo_parent_leave: ['Valid Solo Parent ID', 'Certification of eligibility as solo parent'],
  study_leave: ['Certificate of enrollment / registration from the school', 'Program of study or endorsement (if applicable)'],
  vawc_leave: ['Barangay Protection Order (BPO) or certification', 'Police / medical report (if applicable)'],
  rehabilitation_privilege: ['Medical certification for rehabilitation treatment'],
  special_leave_benefits_women: ['Medical certificate attesting to the gynecological condition'],
  special_emergency: ['Certification from barangay / municipal authorities on the calamity'],
  adoption_leave: ['Court order or placement authority document', 'Birth certificate of the child (if available)'],
  monetization: ['Application for monetization of leave credits', 'Certificate of available leave credits from HR'],
  terminal_leave: ['Certificate of retirement / separation from service', 'Certificate of leave credits from HR']
};

// Official display labels (used in validation messages and the UI)
const LEAVE_TYPE_LABELS = {
  vacation: 'Vacation Leave',
  sick: 'Sick Leave',
  mandatory_forced_leave: 'Mandatory/Forced Leave',
  maternity_leave: 'Maternity Leave',
  paternity_leave: 'Paternity Leave',
  special_privilege_leave: 'Special Privilege Leave',
  solo_parent_leave: 'Solo Parent Leave',
  study_leave: 'Study Leave',
  vawc_leave: 'VAWC Leave',
  rehabilitation_privilege: 'Rehabilitation Privilege',
  special_leave_benefits_women: 'Special Leave Benefits for Women',
  special_emergency: 'Special Emergency (Calamity) Leave',
  adoption_leave: 'Adoption Leave',
  wellness_leave: 'Wellness Leave',
  monetization: 'Monetization of Leave Credits',
  terminal_leave: 'Terminal Leave',
  others_specify: 'Others (Specify)'
};

// Count inclusive calendar days between two YYYY-MM-DD strings / Dates (1 for same day)
const countCalendarDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
};

// Sec. 53: sick leave in excess of five (5) successive days requires a medical certificate.
// "Successive days" = consecutive calendar days covered by the application.
const requiresMedicalCertificate = (leaveRequest) => {
  if (!leaveRequest || leaveRequest.leave_type !== 'sick') return false;
  return countCalendarDays(leaveRequest.start_date, leaveRequest.end_date) > 5;
};

// Required documents for a leave type (dynamic for sick: the medical certificate is
// only mandatory when the application exceeds five (5) successive days — Sec. 53).
const getRequiredDocuments = (leaveType, leaveRequest) => {
  if (leaveType === 'sick') {
    return requiresMedicalCertificate(leaveRequest) ? [...REQUIRED_DOCUMENTS.sick] : [];
  }
  return [...(REQUIRED_DOCUMENTS[leaveType] || [])];
};

// Working days elapsed (Mon–Fri only) between two dates — used by the Sec. 49 SLA flag.
// Holidays are not resolved here (kept synchronous); weekends are the dominant factor.
const workingDaysBetween = (from, to) => {
  const s = new Date(from);
  const e = new Date(to);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  let days = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

// Sec. 49: an application not acted on within five (5) working days after receipt
// shall be deemed approved. Returns the flag + elapsed days for display.
const getSlaInfo = (leaveRequest, now = new Date()) => {
  if (!leaveRequest) return { workingDaysElapsed: 0, overSla: false, deemedApproved: false };
  const receivedAt = leaveRequest.createdAt || new Date();
  const workingDaysElapsed = workingDaysBetween(receivedAt, now);
  const actionable = ['pending', 'recommended', 'hr_approved'].includes(leaveRequest.status);
  return {
    workingDaysElapsed,
    overSla: actionable && workingDaysElapsed > 5,
    deemedApproved: actionable && workingDaysElapsed > 5
  };
};

// Statutory eligibility metadata (annual limits) for the UI and filing checks
const STATUTORY_LIMITS = {
  paternity_leave: { maxDaysPerOccurrence: 7, lifetimeDeliveries: 4, law: 'RA 8187 / Sec. 19' },
  solo_parent_leave: { maxDaysPerYear: 7, law: 'RA 8972' },
  maternity_leave: { maxDays: 105, maxDaysWithExtension: 135, law: 'RA 11210' },
  study_leave: { maxDays: 180, minServiceYears: 1, law: 'CSC MC No. 14 s. 1999' },
  special_privilege_leave: { maxDaysPerYear: 3, law: 'Sec. 21' },
  mandatory_forced_leave: { minDaysPerYear: 5, eligibleVlBalance: 10, law: 'Sec. 25' },
  vawc_leave: { maxDaysPerOccurrence: 10, law: 'RA 9262' },
  special_leave_benefits_women: { maxDaysPerOccurrence: 60, law: 'RA 9710' },
  adoption_leave: { maxDaysPerOccurrence: 60, law: 'RA 11642' },
  rehabilitation_privilege: { maxDaysPerOccurrence: 180, law: 'Sec. 55' },
  // CSC MC No. 1, s. 2026: Wellness Leave — 5 days/year (non-cumulative, non-commutable,
  // forfeited if unused), max 3 consecutive days at a time, filed 5 days in advance.
  wellness_leave: { maxDaysPerYear: 5, maxConsecutiveDays: 3, law: 'CSC MC No. 1, s. 2026' }
};

const round3 = (n) => Math.round(n * 1000) / 1000;

module.exports = {
  VACATION_POOL_TYPES,
  SICK_POOL_TYPES,
  ILLNESS_LEAVE_TYPES,
  REQUIRED_DOCUMENTS,
  LEAVE_TYPE_LABELS,
  STATUTORY_LIMITS,
  countCalendarDays,
  requiresMedicalCertificate,
  getRequiredDocuments,
  getSlaInfo,
  round3
};
