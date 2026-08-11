// Statutory / CSC leave entitlements per leave type (in working days per year).
// Types not listed here either draw from vacation/sick credits or have no fixed
// annual limit (e.g. special emergency / calamity leave).
const STATUTORY_ENTITLEMENTS = {
  maternity_leave: {
    days: 105,
    label: 'Maternity Leave',
    law: 'RA 11210'
  },
  paternity_leave: {
    days: 7,
    label: 'Paternity Leave',
    law: 'RA 8187'
  },
  solo_parent_leave: {
    days: 7,
    label: 'Solo Parent Leave',
    law: 'RA 8972'
  },
  vawc_leave: {
    days: 10,
    label: 'VAWC Leave',
    law: 'RA 9262'
  },
  special_leave_benefits_women: {
    days: 60,
    label: 'Special Leave for Women',
    law: 'RA 9710'
  },
  special_privilege_leave: {
    days: 3,
    label: 'Special Privilege Leave',
    law: 'CSC MC No. 41 s. 1998'
  },
  mandatory_forced_leave: {
    days: 5,
    label: 'Mandatory/Forced Leave',
    law: 'CSC MC No. 41 s. 1998'
  },
  adoption_leave: {
    days: 60,
    label: 'Adoption Leave',
    law: 'RA 11642'
  },
  rehabilitation_privilege: {
    days: 180,
    label: 'Rehabilitation Privilege',
    law: 'CSC MC No. 41 s. 1998'
  },
  study_leave: {
    days: 180,
    label: 'Study Leave',
    law: 'CSC MC No. 41 s. 1998'
  }
};

// Appointment statuses that accrue monthly vacation/sick leave credits.
// Contractual and job-order (JO/COS) workers do not accrue credits.
const CREDIT_ACCRUING_STATUSES = [
  'permanent',
  'temporary',
  'co_terminus',
  'casual',
  'elected_official',
  'other'
];

const APPOINTMENT_STATUSES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'co_terminus', label: 'Co-Terminus' },
  { value: 'contractual', label: 'Contractual' },
  { value: 'casual', label: 'Casual' },
  { value: 'job_order', label: 'Job Order (JO/COS)' },
  { value: 'elected_official', label: 'Elected Official' },
  { value: 'other', label: 'Other' }
];

module.exports = { STATUTORY_ENTITLEMENTS, APPOINTMENT_STATUSES, CREDIT_ACCRUING_STATUSES };
