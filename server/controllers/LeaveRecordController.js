const LeaveRecord = require('../models/LeaveRecord');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveApproval = require('../models/LeaveApproval');
const AuditLog = require('../models/AuditLog');
const { createLeaveRecordValidation, updateLeaveRecordValidation, addUndertimeValidation } = require('../middleware/leaveRecordValidation');
const { logAudit } = require('../utils/audit');
const { STATUTORY_ENTITLEMENTS, CREDIT_ACCRUING_STATUSES } = require('../utils/leaveEntitlements');
const { ILLNESS_LEAVE_TYPES } = require('../utils/cscRules');

// Authorization helpers for leave records.
// HR may access any employee's record; every other role may only access their own.
const denyUnlessHrOrSelf = (req, res) => {
  if (req.user.user_type === 'hr') return false;
  const targetId = req.params.userId;
  if (targetId && targetId !== req.user.user_id) {
    res.status(403).json({ success: false, message: 'Access denied. You can only view your own leave record.' });
    return true;
  }
  return false;
};

const denyUnlessHr = (req, res) => {
  if (req.user.user_type === 'hr') return false;
  res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
  return true;
};

// Proration table for vacation credits
const prorationTable = [
    { present: 30.00, leave_wo_pay: 0.00, credits: 1.250 },
    { present: 29.50, leave_wo_pay: 0.50, credits: 1.229 },
    { present: 29.00, leave_wo_pay: 1.00, credits: 1.208 },
    { present: 28.50, leave_wo_pay: 1.50, credits: 1.188 },
    { present: 28.00, leave_wo_pay: 2.00, credits: 1.167 },
    { present: 27.50, leave_wo_pay: 2.50, credits: 1.146 },
    { present: 27.00, leave_wo_pay: 3.00, credits: 1.125 },
    { present: 26.50, leave_wo_pay: 3.50, credits: 1.104 },
    { present: 26.00, leave_wo_pay: 4.00, credits: 1.083 },
    { present: 25.50, leave_wo_pay: 4.50, credits: 1.063 },
    { present: 25.00, leave_wo_pay: 5.00, credits: 1.042 },
    { present: 24.50, leave_wo_pay: 5.50, credits: 1.021 },
    { present: 24.00, leave_wo_pay: 6.00, credits: 1.000 },
    { present: 23.50, leave_wo_pay: 6.50, credits: 0.979 },
    { present: 23.00, leave_wo_pay: 7.00, credits: 0.958 },
    { present: 22.50, leave_wo_pay: 7.50, credits: 0.938 },
    { present: 22.00, leave_wo_pay: 8.00, credits: 0.914 },
    { present: 21.50, leave_wo_pay: 8.50, credits: 0.896 },
    { present: 21.00, leave_wo_pay: 9.00, credits: 0.875 },
    { present: 20.50, leave_wo_pay: 9.50, credits: 0.854 },
    { present: 20.00, leave_wo_pay: 10.00, credits: 0.833 },
    { present: 19.50, leave_wo_pay: 10.50, credits: 0.813 },
    { present: 19.00, leave_wo_pay: 11.00, credits: 0.792 },
    { present: 18.50, leave_wo_pay: 11.50, credits: 0.771 },
    { present: 18.00, leave_wo_pay: 12.00, credits: 0.750 },
    { present: 17.50, leave_wo_pay: 12.50, credits: 0.729 },
    { present: 17.00, leave_wo_pay: 13.00, credits: 0.708 },
    { present: 16.50, leave_wo_pay: 13.50, credits: 0.687 },
    { present: 16.00, leave_wo_pay: 14.00, credits: 0.667 },
    { present: 15.50, leave_wo_pay: 14.50, credits: 0.646 },
    { present: 15.00, leave_wo_pay: 15.00, credits: 0.625 },
    { present: 14.50, leave_wo_pay: 15.50, credits: 0.604 },
    { present: 14.00, leave_wo_pay: 16.00, credits: 0.583 },
    { present: 13.50, leave_wo_pay: 16.50, credits: 0.562 },
    { present: 13.00, leave_wo_pay: 17.00, credits: 0.542 },
    { present: 12.50, leave_wo_pay: 17.50, credits: 0.521 },
    { present: 12.00, leave_wo_pay: 18.00, credits: 0.500 },
    { present: 11.50, leave_wo_pay: 18.50, credits: 0.479 },
    { present: 11.00, leave_wo_pay: 19.00, credits: 0.458 },
    { present: 10.50, leave_wo_pay: 19.50, credits: 0.437 },
    { present: 10.00, leave_wo_pay: 20.00, credits: 0.417 },
    { present: 9.50, leave_wo_pay: 20.50, credits: 0.396 },
    { present: 9.00, leave_wo_pay: 21.00, credits: 0.375 },
    { present: 8.50, leave_wo_pay: 21.50, credits: 0.354 },
    { present: 8.00, leave_wo_pay: 22.00, credits: 0.333 },
    { present: 7.50, leave_wo_pay: 22.50, credits: 0.312 },
    { present: 7.00, leave_wo_pay: 23.00, credits: 0.292 },
    { present: 6.50, leave_wo_pay: 23.50, credits: 0.271 },
    { present: 6.00, leave_wo_pay: 24.00, credits: 0.250 },
    { present: 5.50, leave_wo_pay: 24.50, credits: 0.229 },
    { present: 5.00, leave_wo_pay: 25.00, credits: 0.208 },
    { present: 4.50, leave_wo_pay: 25.50, credits: 0.187 },
    { present: 4.00, leave_wo_pay: 26.00, credits: 0.167 },
    { present: 3.50, leave_wo_pay: 26.50, credits: 0.146 },
    { present: 3.00, leave_wo_pay: 27.00, credits: 0.125 },
    { present: 2.50, leave_wo_pay: 27.50, credits: 0.104 },
    { present: 2.00, leave_wo_pay: 28.00, credits: 0.083 },
    { present: 1.50, leave_wo_pay: 28.50, credits: 0.062 },
    { present: 1.00, leave_wo_pay: 29.00, credits: 0.042 },
    { present: 0.50, leave_wo_pay: 29.50, credits: 0.021 },
    { present: 0.00, leave_wo_pay: 30.00, credits: 0.000 },
];

function getProratedCredits(daysPresent, lwopDays) {
    const row = prorationTable.find(r => r.present === daysPresent && r.leave_wo_pay === lwopDays);
    return row ? row.credits : 1.250; // Default to full credits
}

// Check if user has sufficient leave credits for a specific leave request
exports.hasSufficientLeaveCredits = async (userId, leaveType, numberOfDays) => {
  try {
    // Get all leave records for this user to calculate cumulative balance
    const allLeaveRecords = await LeaveRecord
      .find({ user_id: userId })
      .sort({ year: -1, month: -1 })
      .exec();
    
    // If no record exists, then there are no credits available
    if (allLeaveRecords.length === 0) {
      // For special leave types (maternity, paternity), return true since they don't use regular credits
      if (leaveType === 'maternity' || leaveType === 'paternity') {
        return true;
      }
      return false;
    }
    
    // Calculate cumulative balance
    const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                          allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
    
    const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                       allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
    
    // Determine available credits based on leave type
    let availableCredits = 0;
    
    // Terminal leave commutes the FULL accumulated vacation + sick leave balance
    // (CSC MC No. 14 s. 1999, as amended — "without limitation and regardless of the
    // period when the credits were earned").
    if (leaveType === 'terminal_leave') {
      availableCredits = vacationBalance + sickBalance;
    }
    // Vacation-type leaves use vacation credits
    else if (leaveType === 'vacation' ||
        leaveType === 'special_privilege_leave' ||
        leaveType === 'study_leave' ||
        leaveType === 'mandatory_forced_leave' ||
        leaveType === 'monetization') {
      availableCredits = vacationBalance;
    }
    // Sick leave uses sick credits
    else if (leaveType === 'sick') {
      availableCredits = sickBalance;
    }
    // Statutory leaves and free-text "Others" types don't consume vacation/sick credits,
    // so they are always considered to have sufficient credits.
    else {
      return true;
    }
    
    // Check if there are enough credits for the requested days
    return availableCredits >= numberOfDays;
  } catch (error) {
    console.error('Error checking leave credits:', error);
    // If there's an error, return true to avoid blocking users
    return true;
  }
};

// Check if user has sufficient leave credits and calculate maximum allowed days
exports.getLeaveCreditsInfo = async (userId, leaveType) => {
  try {
    // Get all leave records for this user to calculate cumulative balance
    const allLeaveRecords = await LeaveRecord
      .find({ user_id: userId })
      .sort({ year: -1, month: -1 })
      .exec();
    
    // If no record exists, use 0 as default values (consistent with UI display)
    if (allLeaveRecords.length === 0) {
      return {
        hasSufficientCredits: false,
        availableCredits: 0,
        maxAllowedDays: 0,
        usesCredits: true,
        vacationBalance: 0,
        sickBalance: 0
      };
    }
    
    // Calculate cumulative balance
    const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                          allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
    
    const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                       allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
    
    // Determine available credits based on leave type
    let availableCredits = 0;
    
    // Terminal leave commutes the FULL accumulated vacation + sick leave balance
    // (CSC MC No. 14 s. 1999, as amended).
    if (leaveType === 'terminal_leave') {
      availableCredits = vacationBalance + sickBalance;
    }
    // Vacation-type leaves use vacation credits
    else if (leaveType === 'vacation' || 
        leaveType === 'special_privilege_leave' || 
        leaveType === 'study_leave' || 
        leaveType === 'mandatory_forced_leave' || 
        leaveType === 'monetization') {
      availableCredits = vacationBalance;
    }
    // Sick leave uses sick credits
    else if (leaveType === 'sick') {
      availableCredits = sickBalance;
    }
    // Statutory leaves (maternity, paternity, solo parent, VAWC, rehabilitation,
    // special leave benefits for women, special emergency, adoption) are separate paid
    // entitlements that never consume vacation/sick credits (CS Form 6's 7.A has no
    // column for them), and free-text "Others" types are decided by the approver at 7.C.
    // None of these need a credit-sufficiency evaluation.
    else {
      return {
        hasSufficientCredits: true,
        availableCredits: 0,
        maxAllowedDays: 0,
        usesCredits: false
      };
    }
    
    return {
      hasSufficientCredits: availableCredits >= 1, // Consider less than 1 as no credits
      availableCredits: availableCredits,
      maxAllowedDays: Math.floor(availableCredits * 1000) / 1000, // Round to 3 decimal places
      usesCredits: true,
      vacationBalance: Math.floor(vacationBalance * 1000) / 1000,
      sickBalance: Math.floor(sickBalance * 1000) / 1000
    };
  } catch (error) {
    console.error('Error checking leave credits:', error);
    // If there's an error, we'll allow the request to proceed to avoid blocking users
    return {
      hasSufficientCredits: true,
      availableCredits: 0,
      maxAllowedDays: 0,
      usesCredits: true,
      vacationBalance: 0,
      sickBalance: 0
    };
  }
};

// Get all leave records with optional filtering
exports.index = async (req, res) => {
  try {
    if (denyUnlessHr(req, res)) return;
    const { department, user_type, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = User.find();
    
    // Apply department filter
    if (department && department !== 'all') {
      query = query.where('department_id', department);
    }
    
    // Apply user type filter
    if (user_type && user_type !== 'all') {
      query = query.where('user_type', user_type);
    }
    
    // Apply search filter
    if (search) {
      query = query.or([
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { user_id: { $regex: search, $options: 'i' } }
      ]);
    }
    
    // Populate department and paginate
    const users = await query
      .populate('department_id')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    // Get total count for pagination
    const total = await User.countDocuments(query.getQuery());
    
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave records', error: error.message });
  }
};

// Get current leave credits for an employee
exports.getCurrentLeaveCredits = async (req, res) => {
  try {
    const userId = req.user.user_id; // Get user ID from authenticated user
    
    // Get all leave records for this user
    const allLeaveRecords = await LeaveRecord
      .find({ user_id: userId })
      .sort({ year: -1, month: -1 })
      .exec();
    
    if (allLeaveRecords.length === 0) {
      // If no record exists, return default values
      return res.json({
        vacationBalance: 0,
        sickBalance: 0
      });
    }
    
    // Calculate cumulative balances
    const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                          allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
    
    const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                       allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
    
    res.json({
      vacationBalance: vacationBalance,
      sickBalance: sickBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave credits', error: error.message });
  }
};

// Get leave records for a specific employee
exports.show = async (req, res) => {
  try {
    if (denyUnlessHrOrSelf(req, res)) return;
    const { userId } = req.params;
    const { year: filterYear } = req.query;

    const employee = await User.findOne({ user_id: userId }).populate('department_id');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const allLeaveRecords = await LeaveRecord.find({ user_id: employee.user_id })
      .sort({ year: 1, month: 1 }).exec();

    const allLeaveRequests = await LeaveRequest.find({ user_id: employee.user_id }).sort({ start_date: 1 });

    // Display placement: which column an entry appears under in the leave record view
    const VACATION_TYPES = [
      'vacation','special_privilege_leave','study_leave','mandatory_forced_leave',
      'maternity_leave','paternity_leave','solo_parent_leave','vawc_leave',
      'rehabilitation_privilege','special_leave_benefits_women','special_emergency',
      'adoption_leave','wellness_leave','others_specify','monetization','terminal_leave'
    ];
    const SICK_TYPES = ['sick'];

    // Actual deduction: only types that recordLeave deducts on approval reduce balances.
    // Statutory leaves (maternity, paternity, etc.), special privilege, study, mandatory
    // and free-text "Others" are recorded without consuming vacation/sick credits.
    // Sick leave charged to vacation via the Sec. 56 one-way draw deducts from vacation.
    const DEDUCT_VACATION_TYPES = ['vacation', 'monetization', 'terminal_leave'];
    const DEDUCT_SICK_TYPES = ['sick'];
    const deductsVacation = (req) =>
      DEDUCT_VACATION_TYPES.includes(req.leave_type) ||
      (req.leave_type === 'sick' && req.charged_to === 'vacation');
    const deductsSick = (req) =>
      DEDUCT_SICK_TYPES.includes(req.leave_type) && req.charged_to !== 'vacation';

    // Only leaves approved by the Mayor are recorded in the leave record.
    // A leave that was approved but later cancelled stays visible with a "cancelled"
    // marker (mayor_approved_by is kept when the request is cancelled).
    const isRecordedLeave = (req) =>
      req.status === 'approved' ||
      (req.status === 'cancelled' && !!req.mayor_approved_by);

    // Per-request deduction split. For terminal leave the approved split
    // (vacation_days / sick_days) is stored at approval time — vacation credits are
    // consumed first, the remainder from sick credits (CSC: full VL + SL balance is
    // commuted). Older requests without the split fall back to the full days from
    // the vacation pool.
    const getSplitDeduction = (req, isApproved, withoutPay) => {
      const total = (isApproved && !withoutPay) ? (req.number_of_days || 0) : 0;
      if (req.leave_type === 'terminal_leave') {
        return { vac: req.vacation_days ?? total, sick: req.sick_days ?? 0 };
      }
      return {
        vac: deductsVacation(req) && total > 0 ? total : 0,
        sick: deductsSick(req) && total > 0 ? total : 0
      };
    };

    // Phase 1: Chronological ledger — only APPROVED non-cancelled, non-without_pay leaves deduct credits
    let runningVac = 0;
    let runningSick = 0;
    const leaveBalanceMap = {};     // leaveId -> balance snapshot around this request
    const monthEndBalanceMap = {};  // "year-month" -> end-of-month balance

    for (const record of allLeaveRecords) {
      runningVac  += (record.vacation_earned || 0);
      runningSick += (record.sick_earned     || 0);

      const monthRequests = allLeaveRequests.filter(req => {
        const d = new Date(req.start_date);
        return d.getFullYear() === record.year && (d.getMonth() + 1) === record.month;
      }).filter(isRecordedLeave);

      for (const req of monthRequests) {
        const isVacType       = VACATION_TYPES.includes(req.leave_type);
        const isSickType      = SICK_TYPES.includes(req.leave_type);
        const deductsVacation = DEDUCT_VACATION_TYPES.includes(req.leave_type);
        const deductsSick     = DEDUCT_SICK_TYPES.includes(req.leave_type);
        const isApproved      = req.status === 'approved';
        const withoutPay      = req.without_pay || false;
        const splitDeduction  = getSplitDeduction(req, isApproved, withoutPay);
        // The reported deduction is the ACTUAL credit reduction (vacation + sick split),
        // not the raw day count — statutory leaves (maternity, paternity, wellness, etc.)
        // are recorded without consuming vacation/sick credits (0.000 on the record).
        const creditsDeducted = splitDeduction.vac + splitDeduction.sick;

        const beforeVac  = runningVac;
        const beforeSick = runningSick;

        if (creditsDeducted > 0) {
          if (splitDeduction.vac  > 0) runningVac  = Math.max(0, runningVac  - splitDeduction.vac);
          if (splitDeduction.sick > 0) runningSick = Math.max(0, runningSick - splitDeduction.sick);
        }

        leaveBalanceMap[req._id.toString()] = {
          credits_deducted: creditsDeducted,
          credits_before_vac:  beforeVac,
          credits_before_sick: beforeSick,
          running_vacation_balance: runningVac,
          running_sick_balance:     runningSick,
        };
      }

      // Undertime is stored in undertime_hours of the monthly record (in days).
      // Note: vacation_used ALSO carries approved-leave days written by recordLeave,
      // so it cannot be used here or the approved days would be subtracted twice.
      runningVac = Math.max(0, runningVac - (record.undertime_hours || 0));

      monthEndBalanceMap[`${record.year}-${record.month}`] = {
        vacation_balance: runningVac,
        sick_balance:     runningSick,
      };
    }

    // Edge-case: requests with no matching monthly record
    for (const req of allLeaveRequests) {
      if (leaveBalanceMap[req._id.toString()]) continue;
      if (!isRecordedLeave(req)) continue;
      const isVacType  = VACATION_TYPES.includes(req.leave_type);
      const isSickType = SICK_TYPES.includes(req.leave_type);
      const deductsVacation = DEDUCT_VACATION_TYPES.includes(req.leave_type);
      const deductsSick     = DEDUCT_SICK_TYPES.includes(req.leave_type);
      const isApproved = req.status === 'approved';
      const withoutPay = req.without_pay || false;
      const splitDeduction  = getSplitDeduction(req, isApproved, withoutPay);
      // Same actual-deduction semantics as the main loop (see above)
      const creditsDeducted = splitDeduction.vac + splitDeduction.sick;
      const beforeVac  = runningVac;
      const beforeSick = runningSick;
      if (creditsDeducted > 0) {
        if (splitDeduction.vac  > 0) runningVac  = Math.max(0, runningVac  - splitDeduction.vac);
        if (splitDeduction.sick > 0) runningSick = Math.max(0, runningSick - splitDeduction.sick);
      }
      leaveBalanceMap[req._id.toString()] = {
        credits_deducted: creditsDeducted, credits_before_vac: beforeVac, credits_before_sick: beforeSick,
        running_vacation_balance: runningVac, running_sick_balance: runningSick,
      };
    }

    // Phase 2: Summary totals
    const totalVacEarned    = allLeaveRecords.reduce((s, r) => s + (r.vacation_earned || 0), 0);
    const totalSickEarned   = allLeaveRecords.reduce((s, r) => s + (r.sick_earned     || 0), 0);
    // Undertime only — vacation_used also includes approved-leave days written by
    // recordLeave, so summing it here would double-count those days.
    const totalUndertimeVac = allLeaveRecords.reduce((s, r) => s + (r.undertime_hours || 0), 0);

    const approvedVacUsed = allLeaveRequests
      .filter(r => r.status === 'approved' && !r.without_pay && deductsVacation(r))
      .reduce((s, r) => s + (r.vacation_days ?? (r.number_of_days || 0)), 0);
    const approvedSickUsed = allLeaveRequests
      .filter(r => r.status === 'approved' && !r.without_pay && (deductsSick(r) || r.leave_type === 'terminal_leave'))
      .reduce((s, r) => s + (r.leave_type === 'terminal_leave' ? (r.sick_days ?? 0) : (r.number_of_days || 0)), 0);

    const vacationSummary = {
      earned:  totalVacEarned,
      used:    totalUndertimeVac + approvedVacUsed,
      balance: totalVacEarned - totalUndertimeVac - approvedVacUsed,
    };
    const sickSummary = {
      earned:  totalSickEarned,
      used:    approvedSickUsed,
      balance: totalSickEarned - approvedSickUsed,
    };

    // Resolve approver names (who recommended/approved) so the digital form shows real names
    const approverIds = new Set();
    allLeaveRequests.forEach(r => {
      if (r.department_approved_by) approverIds.add(r.department_approved_by);
      if (r.hr_approved_by)        approverIds.add(r.hr_approved_by);
      if (r.mayor_approved_by)     approverIds.add(r.mayor_approved_by);
      if (r.credits_certified_by)  approverIds.add(r.credits_certified_by);
    });
    const approverUsers = approverIds.size > 0
      ? await User.find({ user_id: { $in: [...approverIds] } }).select('user_id first_name middle_initial last_name').exec()
      : [];
    const approverNameMap = {};
    approverUsers.forEach(u => {
      approverNameMap[u.user_id] = `${u.first_name}${u.middle_initial ? ' ' + u.middle_initial + '.' : ''} ${u.last_name}`.toUpperCase();
    });

    // Phase 3: Build processed records
    const buildEntry = (req, isVacType) => {
      const bal = leaveBalanceMap[req._id.toString()] || {};
      return {
        leave_id: req._id, type: req.leave_type, days: req.number_of_days,
        credits_deducted:         bal.credits_deducted ?? 0,
        credits_before_deduction: isVacType ? (bal.credits_before_vac ?? 0) : (bal.credits_before_sick ?? 0),
        running_vacation_balance: bal.running_vacation_balance ?? 0,
        running_sick_balance:     bal.running_sick_balance     ?? 0,
        start_date: new Date(req.start_date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }),
        end_date:   new Date(req.end_date).toLocaleDateString('en-US',   { year:'numeric', month:'short', day:'numeric' }),
        raw_start_date: req.start_date, raw_end_date: req.end_date,
        where_spent: req.where_spent, location_specify: req.location_specify,
        commutation: req.commutation, paid: !req.without_pay, status: req.status,
        cancelled: req.status === 'cancelled',
        applicant_signature: req.applicant_signature, hr_signature: req.hr_signature,
        department_signature: req.department_signature, mayor_signature: req.mayor_signature,
        official_pdf: req.official_pdf || null,
        department_approved_by_name: approverNameMap[req.department_approved_by] || '',
        hr_approved_by_name:         approverNameMap[req.hr_approved_by]        || '',
        mayor_approved_by_name:      approverNameMap[req.mayor_approved_by]     || '',
        credits_certified: req.credits_certified || false,
        credits_certified_by_name: approverNameMap[req.credits_certified_by] || '',
        credits_certified_at: req.credits_certified_at || null,
        certified_balances: req.certified_balances || null,
        created_at: req.createdAt,
      };
    };

    const processedRecords = allLeaveRecords.map(record => {
      const monthRequests = allLeaveRequests.filter(req => {
        const d = new Date(req.start_date);
        return d.getFullYear() === record.year && (d.getMonth() + 1) === record.month;
      }).filter(isRecordedLeave);
      const vacationEntries = monthRequests.filter(r => VACATION_TYPES.includes(r.leave_type)).map(r => buildEntry(r, true));
      const sickEntries     = monthRequests.filter(r => SICK_TYPES.includes(r.leave_type)).map(r => buildEntry(r, false));
      const endBal = monthEndBalanceMap[`${record.year}-${record.month}`] || {};
      return {
        ...record.toObject(),
        vacation_balance: endBal.vacation_balance ?? record.vacation_balance,
        sick_balance:     endBal.sick_balance     ?? record.sick_balance,
        vacation_entries: vacationEntries,
        sick_entries:     sickEntries,
      };
    });

    const leaveRecords = {};
    processedRecords.reverse().forEach(record => {
      if (!leaveRecords[record.year]) leaveRecords[record.year] = [];
      leaveRecords[record.year].push(record);
    });

    let leaveRequestsForSummary = allLeaveRequests;
    if (filterYear) {
      leaveRequestsForSummary = allLeaveRequests.filter(req =>
        new Date(req.start_date).getFullYear() === parseInt(filterYear)
      );
    }
    const leaveTypeCounts = {};
    leaveRequestsForSummary.forEach(req => {
      if (req.status === 'cancelled') return;
      leaveTypeCounts[req.leave_type] = (leaveTypeCounts[req.leave_type] || 0) + 1;
    });

    res.json({ employee, leaveRecords, vacationSummary, sickSummary, leaveTypeSummary: leaveTypeCounts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave records', error: error.message });
  }
};

// Get leave record for a specific month/year for an employee
exports.getMonthlyRecord = async (req, res) => {
  try {
    if (denyUnlessHrOrSelf(req, res)) return;
    const { userId } = req.params;
    const { month, year } = req.query;
    
    const record = await LeaveRecord.findOne({ user_id: userId, month, year });
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave record', error: error.message });
  }
};

// Get statutory leave entitlements and usage for an employee in a given year
// @route   GET /api/leave-records/entitlements/:userId?year=YYYY
// @access  Private
// Note: registered before /:userId in the router
// @desc    Statutory (non-vacation/sick) leave usage per year
exports.getEntitlements = async (req, res) => {
  try {
    if (denyUnlessHrOrSelf(req, res)) return;
    const { userId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const employee = await User.findOne({ user_id: userId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Only leaves actually approved by the Mayor count as used.
    const requests = await LeaveRequest.find({
      user_id: userId,
      status: 'approved',
      start_date: { $gte: yearStart, $lte: yearEnd }
    });

    const usedByType = {};
    requests.forEach(r => {
      usedByType[r.leave_type] = (usedByType[r.leave_type] || 0) + (r.number_of_days || 0);
    });

    const entitlements = Object.entries(STATUTORY_ENTITLEMENTS).map(([type, def]) => {
      const used = usedByType[type] || 0;
      return {
        leave_type: type,
        label: def.label,
        law: def.law,
        limit: def.days,
        used,
        remaining: def.days === null ? null : Math.max(0, def.days - used)
      };
    });

    res.json({ success: true, year, entitlements });
  } catch (error) {
    console.error('Error fetching leave entitlements:', error);
    res.status(500).json({ message: 'Error fetching leave entitlements', error: error.message });
  }
};

// Get audit logs for leave-record changes
// @route   GET /api/leave-records/audit-logs?userId=&limit=
// @access  Private (HR only)
// Note: registered before /:userId in the router
exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.user_type !== 'hr') {
      return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
    }

    const { userId } = req.query;
    const query = userId ? { user_id: userId } : {};
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 100)
      .exec();

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};

// Create a new leave record
exports.store = async (req, res) => {
  try {
    if (denyUnlessHr(req, res)) return;
    const {
      user_id,
      month,
      year,
      vacation_earned,
      vacation_used,
      sick_earned,
      sick_used,
      undertime_hours,
      vacation_entries,
      sick_entries
    } = req.body;
    
    // Validate required fields
    if (!user_id || !month || !year) {
      return res.status(400).json({ message: 'User ID, month, and year are required' });
    }
    
    // Check if user exists
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create leave record
    const leaveRecord = new LeaveRecord({
      user_id,
      month,
      year,
      vacation_earned: vacation_earned || 1.25,
      vacation_used: vacation_used || 0,
      sick_earned: sick_earned || 1.25,
      sick_used: sick_used || 0,
      undertime_hours: undertime_hours || 0,
      vacation_entries: vacation_entries || [],
      sick_entries: sick_entries || [],
      // Calculate balances
      vacation_balance: (vacation_earned || 1.25) - (vacation_used || 0),
      sick_balance: (sick_earned || 1.25) - (sick_used || 0)
    });
    
    const savedRecord = await leaveRecord.save();

    await logAudit({
      actor: req.user,
      action: 'add_record',
      user_id,
      entity_id: savedRecord._id,
      after: {
        month, year,
        vacation_earned: savedRecord.vacation_earned,
        vacation_used: savedRecord.vacation_used,
        sick_earned: savedRecord.sick_earned,
        sick_used: savedRecord.sick_used,
        undertime_hours: savedRecord.undertime_hours
      },
      details: `Created leave record for ${month}/${year}`
    });

    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error creating leave record', error: error.message });
  }
};

// Update a leave record
exports.update = async (req, res) => {
  try {
    if (denyUnlessHr(req, res)) return;
    const { id } = req.params;
    const {
      vacation_earned,
      vacation_used,
      sick_earned,
      sick_used,
      undertime_hours,
      vacation_entries,
      sick_entries
    } = req.body;
    
    // Find the leave record
    const leaveRecord = await LeaveRecord.findById(id);
    
    if (!leaveRecord) {
      return res.status(404).json({ message: 'Leave record not found' });
    }

    const before = {
      month: leaveRecord.month,
      year: leaveRecord.year,
      vacation_earned: leaveRecord.vacation_earned,
      vacation_used: leaveRecord.vacation_used,
      sick_earned: leaveRecord.sick_earned,
      sick_used: leaveRecord.sick_used,
      undertime_hours: leaveRecord.undertime_hours
    };
    
    // Update fields if provided
    if (vacation_earned !== undefined) leaveRecord.vacation_earned = vacation_earned;
    if (vacation_used !== undefined) leaveRecord.vacation_used = vacation_used;
    if (sick_earned !== undefined) leaveRecord.sick_earned = sick_earned;
    if (sick_used !== undefined) leaveRecord.sick_used = sick_used;
    if (undertime_hours !== undefined) leaveRecord.undertime_hours = undertime_hours;
    if (vacation_entries !== undefined) leaveRecord.vacation_entries = vacation_entries;
    if (sick_entries !== undefined) leaveRecord.sick_entries = sick_entries;
    // Manual edits are never clobbered by the automatic accrual recompute
    leaveRecord.auto_calculated = false;
    
    // Recalculate balances
    leaveRecord.vacation_balance = leaveRecord.vacation_earned - leaveRecord.vacation_used;
    leaveRecord.sick_balance = leaveRecord.sick_earned - leaveRecord.sick_used;
    
    const updatedRecord = await leaveRecord.save();

    await logAudit({
      actor: req.user,
      action: 'update_record',
      user_id: leaveRecord.user_id,
      entity_id: leaveRecord._id,
      before,
      after: {
        month: leaveRecord.month,
        year: leaveRecord.year,
        vacation_earned: leaveRecord.vacation_earned,
        vacation_used: leaveRecord.vacation_used,
        sick_earned: leaveRecord.sick_earned,
        sick_used: leaveRecord.sick_used,
        undertime_hours: leaveRecord.undertime_hours
      },
      details: `Updated leave record for ${leaveRecord.month}/${leaveRecord.year}`
    });

    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error updating leave record', error: error.message });
  }
};

// Add undertime to a leave record
exports.addUndertime = async (req, res) => {
  try {
    if (denyUnlessHr(req, res)) return;
    const { user_id, month, year, undertime_hours } = req.body;

    // Validate required fields
    if (!user_id || !month || !year || undertime_hours === undefined) {
      return res.status(400).json({ message: 'User ID, month, year, and undertime hours are required' });
    }

    // Validation: Prevent adding undertime for future months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    if (year > currentYear || (year == currentYear && month > currentMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add undertime for a future month.'
      });
    }

    // Round the undertime to 3 decimal places
    const undertimeToAdd = Math.round(undertime_hours * 1000) / 1000;

    // Check if a leave record already exists for this user/month/year
    let leaveRecord = await LeaveRecord.findOne({ user_id, month, year });

    const before = leaveRecord
      ? { undertime_hours: leaveRecord.undertime_hours, vacation_used: leaveRecord.vacation_used }
      : null;

    if (leaveRecord) {
      // Update existing record by ADDING to the current undertime
      const newUndertime = Math.round((leaveRecord.undertime_hours + undertimeToAdd) * 1000) / 1000;
      leaveRecord.undertime_hours = newUndertime;

      // Deduct undertime from vacation leave balance
      const newVacationUsed = Math.round((leaveRecord.vacation_used + undertimeToAdd) * 1000) / 1000;
      leaveRecord.vacation_used = newVacationUsed;
      leaveRecord.vacation_balance = Math.round((leaveRecord.vacation_earned - leaveRecord.vacation_used) * 1000) / 1000;

      await leaveRecord.save();
    } else {
      // Create new record with default values
      // Deduct undertime from vacation leave balance
      const vacationUsed = Math.round(undertimeToAdd * 1000) / 1000;
      const vacationBalance = Math.round((1.25 - vacationUsed) * 1000) / 1000;

      leaveRecord = new LeaveRecord({
        user_id,
        month,
        year,
        vacation_earned: 1.25,
        vacation_used: vacationUsed,
        vacation_balance: vacationBalance,
        sick_earned: 1.25,
        sick_used: 0,
        sick_balance: 1.25,
        undertime_hours: undertimeToAdd,
        auto_calculated: false
      });

      await leaveRecord.save();
    }
    // Manual undertime edits are never clobbered by the automatic accrual recompute
    leaveRecord.auto_calculated = false;
    await leaveRecord.save();

    await logAudit({
      actor: req.user,
      action: 'add_undertime',
      user_id,
      entity_id: leaveRecord._id,
      before,
      after: {
        undertime_hours: leaveRecord.undertime_hours,
        vacation_used: leaveRecord.vacation_used
      },
      details: `Added ${undertimeToAdd} day(s) of undertime for ${month}/${year}`
    });

    res.json({
      success: true,
      message: 'Undertime added successfully',
      record: leaveRecord,
      added_undertime: undertimeToAdd
    });
  } catch (error) {
    console.error('Error in addUndertime:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding undertime: ' + error.message
    });
  }
};

// Manually add/update earned leave credits (vacation/sick) for a user's month record
// @route   POST /api/leave-records/add-credits
// @access  Private (HR only via UI)
exports.addCredits = async (req, res) => {
  try {
    if (denyUnlessHr(req, res)) return;
    const { user_id, month, year, vacation_earned, sick_earned } = req.body;

    if (!user_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'User ID, month, and year are required' });
    }

    if (vacation_earned === undefined && sick_earned === undefined) {
      return res.status(400).json({ success: false, message: 'Provide at least one credit value (vacation or sick earned)' });
    }

    // Validation: prevent adding credits for future months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year > currentYear || (year == currentYear && month > currentMonth)) {
      return res.status(400).json({ success: false, message: 'Cannot add leave credits for a future month.' });
    }

    // Find the month record; create it if it doesn't exist yet
    let leaveRecord = await LeaveRecord.findOne({ user_id, month, year });

    const before = leaveRecord
      ? { vacation_earned: leaveRecord.vacation_earned, sick_earned: leaveRecord.sick_earned }
      : null;

    if (!leaveRecord) {
      leaveRecord = new LeaveRecord({
        user_id,
        month,
        year,
        vacation_earned: 0,
        vacation_used: 0,
        vacation_balance: 0,
        sick_earned: 0,
        sick_used: 0,
        sick_balance: 0,
        undertime_hours: 0,
        lwop_days: 0,
        vacation_entries: [],
        sick_entries: []
      });
    }

    // Update only the fields provided, rounded to 3 decimal places
    if (vacation_earned !== undefined) leaveRecord.vacation_earned = Math.round(vacation_earned * 1000) / 1000;
    if (sick_earned !== undefined) leaveRecord.sick_earned = Math.round(sick_earned * 1000) / 1000;
    // Manual credit edits are never clobbered by the automatic accrual recompute
    leaveRecord.auto_calculated = false;

    // Recalculate balances
    leaveRecord.vacation_balance = Math.round((leaveRecord.vacation_earned - leaveRecord.vacation_used) * 1000) / 1000;
    leaveRecord.sick_balance = Math.round((leaveRecord.sick_earned - leaveRecord.sick_used) * 1000) / 1000;

    await leaveRecord.save();

    await logAudit({
      actor: req.user,
      action: 'add_credits',
      user_id,
      entity_id: leaveRecord._id,
      before,
      after: {
        vacation_earned: leaveRecord.vacation_earned,
        sick_earned: leaveRecord.sick_earned
      },
      details: `Set earned credits for ${month}/${year}`
    });

    res.json({
      success: true,
      message: 'Leave credits saved successfully',
      record: leaveRecord
    });
  } catch (error) {
    console.error('Error adding leave credits:', error);
    res.status(500).json({ success: false, message: 'Error adding leave credits: ' + error.message });
  }
};

// ===== Monthly accrual engine (Secs. 27/28 of the Omnibus Rules on Leave) =====

// Calendar days of overlap between a leave range and a month window
const overlapCalendarDays = (leaveStart, leaveEnd, monthStart, monthEnd) => {
  const s = new Date(Math.max(new Date(leaveStart), monthStart));
  const e = new Date(Math.min(new Date(leaveEnd), monthEnd));
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
};

// Approved without-pay days overlapping a month, split by illness vs non-illness.
// Sec. 28: LWOP for any reason OTHER than illness does not count as actual service;
// unpaid sick leave does count. The LeaveApproval record set by HR is the authoritative
// source of the without-pay decision (not the request's auto-set flag).
const computeMonthLwop = async (userId, month, year) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const withoutPayApprovals = await LeaveApproval.find({ approval: 'approve', approved_for: 'without_pay' });
  const withoutPayIds = withoutPayApprovals.map(a => a.leave_id);
  if (!withoutPayIds.length) return { nonIllnessLwopDays: 0, illnessLwopDays: 0 };

  const requests = await LeaveRequest.find({
    _id: { $in: withoutPayIds },
    user_id: userId,
    status: 'approved',
    start_date: { $lte: monthEnd },
    end_date: { $gte: monthStart }
  });

  let nonIllness = 0;
  let illness = 0;
  for (const r of requests) {
    const overlap = overlapCalendarDays(r.start_date, r.end_date, monthStart, monthEnd);
    if (ILLNESS_LEAVE_TYPES.includes(r.leave_type)) illness += overlap;
    else nonIllness += overlap;
  }
  return { nonIllnessLwopDays: nonIllness, illnessLwopDays: illness };
};

// Days of the month before the employee's appointment date (mid-month hires are
// prorated — they do not earn a full month of credits in their first month).
const computePreAppointmentDays = (user, month, year) => {
  if (!user || !user.start_date) return 0;
  const startDate = new Date(user.start_date);
  if (isNaN(startDate.getTime())) return 0;
  if (startDate.getFullYear() !== year || startDate.getMonth() + 1 !== month) return 0;
  return Math.max(0, startDate.getDate() - 1);
};

// Sec. 2: part-time employees earn leave credits proportionally to hours rendered
// (20 hrs/week → 7.5 VL + 7.5 SL per year, i.e. half the full-time rate).
const getPartTimeMultiplier = (user) => {
  const hours = user && user.part_time_weekly_hours;
  if (hours && hours > 0 && hours < 40) return hours / 40;
  return 1;
};

// Round to the nearest 0.5 so the CSC proration table rows match exactly
const roundHalf = (n) => Math.max(0, Math.min(30, Math.round(n * 2) / 2));

// Recompute one employee's monthly earned credits from actual service.
//   force: recompute even manually-edited records (used by the HR batch button);
//   otherwise only auto-calculated records are recomputed so HR corrections survive.
// Returns the leave record, or null when nothing applies (non-accruing appointment,
// or a month before the appointment with no existing record).
exports.recomputeMonthCredits = async (userId, month, year, actor = null, force = false) => {
  const user = await User.findOne({ user_id: userId });
  if (!user) return null;

  const accruesCredits = CREDIT_ACCRUING_STATUSES.includes(user.appointment_status || 'permanent');

  let leaveRecord = await LeaveRecord.findOne({ user_id: userId, month, year });
  if (!leaveRecord) {
    // Don't create records for months before the employee's appointment, or for
    // non-accruing appointments (contractual / JO) that never earn credits.
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    if (user.start_date && new Date(user.start_date) > monthEnd) return null;
    if (!accruesCredits) return null;
    leaveRecord = new LeaveRecord({
      user_id: userId,
      month,
      year,
      vacation_earned: 0,
      vacation_used: 0,
      vacation_balance: 0,
      sick_earned: 0,
      sick_used: 0,
      sick_balance: 0,
      undertime_hours: 0,
      lwop_days: 0,
      vacation_entries: [],
      sick_entries: [],
      auto_calculated: true
    });
  }

  if (!accruesCredits) {
    leaveRecord.vacation_earned = 0;
    leaveRecord.sick_earned = 0;
    leaveRecord.lwop_days = 0;
    leaveRecord.auto_calculated = true;
  } else if (force || leaveRecord.auto_calculated !== false) {
    const { nonIllnessLwopDays } = await computeMonthLwop(userId, month, year);
    const preAppointmentDays = computePreAppointmentDays(user, month, year);
    const daysPresent = roundHalf(30 - nonIllnessLwopDays - preAppointmentDays);
    const prorated = getProratedCredits(daysPresent, 30 - daysPresent);
    const multiplier = getPartTimeMultiplier(user);
    // Secs. 27/28: BOTH vacation and sick credits are earned on actual service,
    // so sick credits are prorated on the same basis as vacation.
    leaveRecord.vacation_earned = Math.round(prorated * multiplier * 1000) / 1000;
    leaveRecord.sick_earned = Math.round(prorated * multiplier * 1000) / 1000;
    leaveRecord.lwop_days = Math.round(nonIllnessLwopDays * 1000) / 1000;
    leaveRecord.auto_calculated = true;
  }

  // Carry balances forward from the previous month
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevRecord = await LeaveRecord.findOne({ user_id: userId, month: prevMonth, year: prevYear });
  const prevVacationBalance = prevRecord ? prevRecord.vacation_balance : 0;
  const prevSickBalance = prevRecord ? prevRecord.sick_balance : 0;

  leaveRecord.vacation_balance = Math.round((prevVacationBalance + leaveRecord.vacation_earned - leaveRecord.vacation_used) * 1000) / 1000;
  leaveRecord.sick_balance = Math.round((prevSickBalance + leaveRecord.sick_earned - leaveRecord.sick_used) * 1000) / 1000;

  await leaveRecord.save();

  await logAudit({
    actor,
    action: 'calculate_credits',
    user_id: userId,
    entity_id: leaveRecord._id,
    after: {
      month, year,
      lwop_days: leaveRecord.lwop_days,
      vacation_earned: leaveRecord.vacation_earned,
      sick_earned: leaveRecord.sick_earned
    },
    details: `${force ? 'Manual' : 'Automatic'} monthly credit calculation for ${month}/${year}`
  });

  return leaveRecord;
};

// Accrue every month from the floor year up to the previous month for all employees.
// Idempotent: recomputes auto-calculated records and creates missing ones. Runs on
// server start and daily so credits cannot silently lapse when HR forgets to click.
exports.accrueCreditsUpTo = async (now = new Date(), actor = null) => {
  const START_YEAR = 2024;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const users = await User.find({});

  let processed = 0;
  for (let year = START_YEAR; year <= currentYear; year++) {
    const maxMonth = year === currentYear ? currentMonth - 1 : 12; // current month accrues when it ends
    for (let month = 1; month <= maxMonth; month++) {
      for (const user of users) {
        const record = await exports.recomputeMonthCredits(user.user_id, month, year, actor, false);
        if (record) processed++;
      }
    }
  }
  return { processed };
};

// Manual trigger for the up-to-now automatic accrual (HR fallback)
exports.accrueNow = async (req, res) => {
  if (req.user.user_type !== 'hr') {
    return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
  }
  try {
    const { processed } = await exports.accrueCreditsUpTo(new Date(), req.user);
    res.json({ success: true, message: `Automatic accrual complete (${processed} month-record(s) processed).` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error running automatic accrual: ' + error.message });
  }
};

// Mandatory/forced leave tracker (Sec. 25): employees with 10+ days vacation leave
// must take 5 working days of forced leave per year; forfeited if not taken.
exports.getForcedLeaveStatus = async (req, res) => {
  if (req.user.user_type !== 'hr') {
    return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
  }
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const users = await User.find({}).populate('department_id');
  const allRecords = await LeaveRecord.find({});
  const balanceByUser = {};
  allRecords.forEach(rec => {
    const b = balanceByUser[rec.user_id] || { vE: 0, vU: 0 };
    b.vE += rec.vacation_earned || 0;
    b.vU += rec.vacation_used || 0;
    balanceByUser[rec.user_id] = b;
  });

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const forcedLeaves = await LeaveRequest.find({
    leave_type: 'mandatory_forced_leave',
    status: 'approved',
    start_date: { $gte: yearStart, $lte: yearEnd }
  });
  // LeaveRequest.find() populates user_id into a full user object — extract the raw id
  const rawUserId = (r) => r.user_id && typeof r.user_id === 'object' ? r.user_id.user_id : r.user_id;
  const takenByUser = {};
  forcedLeaves.forEach(r => {
    const id = rawUserId(r);
    takenByUser[id] = (takenByUser[id] || 0) + (r.number_of_days || 0);
  });

  const employees = users.map(u => {
    const bal = balanceByUser[u.user_id] || { vE: 0, vU: 0 };
    const vacationBalance = bal.vE - bal.vU;
    const taken = takenByUser[u.user_id] || 0;
    const eligible = vacationBalance >= 10;
    let statusLabel;
    if (!eligible) statusLabel = 'Below 10 days VL — optional';
    else if (taken >= 5) statusLabel = 'Completed';
    else if (taken > 0) statusLabel = `Needs ${Math.round((5 - taken) * 1000) / 1000} more day(s)`;
    else statusLabel = 'Not taken — forfeited if not taken this year (Sec. 25)';
    return {
      user_id: u.user_id,
      name: `${u.first_name}${u.middle_initial ? ' ' + u.middle_initial + '.' : ''} ${u.last_name}`.trim(),
      department: u.department_id ? (u.department_id.name || '—') : '—',
      appointment_status: u.appointment_status,
      vacation_balance: Math.round(vacationBalance * 1000) / 1000,
      eligible,
      taken_days: Math.round(taken * 1000) / 1000,
      required_done: taken >= 5,
      status_label: statusLabel
    };
  });

  res.json({ success: true, year, employees });
};

// Wellness leave usage tracker (CSC MC No. 1, s. 2026): every eligible employee is
// entitled to five (5) days of wellness leave per calendar year — non-cumulative,
// non-commutable, and forfeited if not used within the year. Shows HR who has used
// their days and who still has remaining entitlement.
exports.getWellnessLeaveStatus = async (req, res) => {
  if (req.user.user_type !== 'hr') {
    return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
  }
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const users = await User.find({}).populate('department_id');
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const wellnessLeaves = await LeaveRequest.find({
    leave_type: 'wellness_leave',
    status: 'approved',
    start_date: { $gte: yearStart, $lte: yearEnd }
  });

  // LeaveRequest.find() populates user_id into a full user object — extract the raw id
  const rawUserId = (r) => r.user_id && typeof r.user_id === 'object' ? r.user_id.user_id : r.user_id;
  const usedByUser = {};
  const requestsByUser = {};
  wellnessLeaves.forEach(r => {
    const id = rawUserId(r);
    usedByUser[id] = (usedByUser[id] || 0) + (r.number_of_days || 0);
    (requestsByUser[id] = requestsByUser[id] || []).push({
      start_date: new Date(r.start_date).toISOString().split('T')[0],
      end_date: new Date(r.end_date).toISOString().split('T')[0],
      days: r.number_of_days
    });
  });

  const employees = users.map(u => {
    const used = Math.round((usedByUser[u.user_id] || 0) * 1000) / 1000;
    const remaining = Math.max(0, Math.round((5 - used) * 1000) / 1000);
    return {
      user_id: u.user_id,
      name: `${u.first_name}${u.middle_initial ? ' ' + u.middle_initial + '.' : ''} ${u.last_name}`.trim(),
      department: u.department_id ? (u.department_id.name || '—') : '—',
      appointment_status: u.appointment_status,
      used_days: used,
      remaining_days: remaining,
      fully_used: used >= 5,
      requests: requestsByUser[u.user_id] || []
    };
  });

  res.json({ success: true, year, employees });
};

// Calculate and award monthly leave credits (manual HR batch — kept as an explicit,
// audited fallback to the automatic job)
