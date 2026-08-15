const LeaveRequest = require('../models/LeaveRequest');
const LeaveRecord = require('../models/LeaveRecord');
const {
  sendNewLeaveRequestNotification,
  sendRecommendedLeaveRequestNotification,
  sendHrApprovedLeaveRequestNotification,
  sendLeaveStatusUpdateToEmployee
} = require('../utils/notificationUtils');
const User = require('../models/User');
const { getLeaveCreditsInfo } = require('./LeaveRecordController');
const { getHolidayDates } = require('../utils/holidayUtils');
const { requiresMedicalCertificate } = require('../utils/cscRules');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Format a Date as YYYY-MM-DD (local time)
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Count working days (Mon–Fri, inclusive) between two YYYY-MM-DD dates.
// CS Form 6 6.C asks for "Number of Working Days Applied For", so weekends AND
// non-working holidays are excluded. Pass holidayDates as a Set of YYYY-MM-DD strings.
const countWorkingDays = (startDate, endDate, holidayDates = new Set()) => {
  try {
    const partsS = String(startDate).split('-').map(Number);
    const partsE = String(endDate).split('-').map(Number);
    if (partsS.length !== 3 || partsE.length !== 3 || partsS.some(isNaN) || partsE.some(isNaN)) return null;
    const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
    const e = new Date(partsE[0], partsE[1] - 1, partsE[2]);
    if (e < s) return null;
    let workingDays = 0;
    const current = new Date(s);
    while (current <= e) {
      const day = current.getDay();
      const dateStr = toDateStr(current);
      if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) { // 0 = Sunday, 6 = Saturday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    return Math.max(1, workingDays);
  } catch (error) {
    return null;
  }
};

// Fetch all non-working holiday dates between two YYYY-MM-DD dates (inclusive)
const getHolidayDatesForRange = async (startDate, endDate) => {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return new Set();
  const startYear = s.getFullYear();
  const endYear = e.getFullYear();
  const dates = [];
  for (let y = startYear; y <= endYear; y++) {
    const { dates: yearDates } = await getHolidayDates(y);
    dates.push(...yearDates);
  }
  return new Set(dates);
};

// Check if the new leave request dates overlap with existing leave requests
const hasOverlappingLeave = async (userId, startDate, endDate, excludeId = null) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Query for overlapping leave requests
    let query = {
      user_id: userId,
      $or: [
        // Case 1: New leave starts before existing leave ends and new leave ends after existing leave starts
        { start_date: { $lte: end }, end_date: { $gte: start } }
      ],
      // Cancelled and disapproved requests free up the dates for a new application
      status: { $nin: ['cancelled', 'disapproved'] }
    };
    
    // If we're updating an existing request, exclude it from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const overlappingRequests = await LeaveRequest.find(query);
    return overlappingRequests.length > 0;
  } catch (error) {
    console.error('Error checking for overlapping leave:', error);
    return false; // In case of error, we don't block the request
  }
};

// Statutory eligibility limits enforced at filing (RA 8187 / RA 11210 / RA 8972 /
// CSC MC No. 14 s. 1999). Returns an error message string, or null when eligible.
const checkStatutoryEligibility = async (user, leaveType, numberOfDays, startDate) => {
  const days = parseFloat(numberOfDays);
  const start = new Date(startDate);
  const year = start.getFullYear();

  // Paternity — Sec. 19 / RA 8187: 7 working days for the first FOUR deliveries only
  if (leaveType === 'paternity_leave') {
    if (days > 7) {
      return 'Per RA 8187 (Sec. 19, Omnibus Rules on Leave), paternity leave is seven (7) working days per delivery.';
    }
    const deliveriesAvailed = await LeaveRequest.countDocuments({
      user_id: user.user_id,
      leave_type: 'paternity_leave',
      status: { $nin: ['cancelled', 'disapproved'] }
    });
    if (deliveriesAvailed >= 4) {
      return 'Per RA 8187 / CSC Sec. 19, paternity leave may be availed of for only the first four (4) deliveries. You have already availed of the maximum.';
    }
  }

  // Solo parent — RA 8972: 7 days per calendar year
  if (leaveType === 'solo_parent_leave') {
    const usedThisYear = await getYearlyLeaveDays(user.user_id, 'solo_parent_leave', year);
    if (usedThisYear + days > 7) {
      return `Per RA 8972, solo parent leave is seven (7) days per calendar year. You have ${usedThisYear.toFixed(1)} day(s) used; this request would exceed the annual limit.`;
    }
  }

  // Maternity — RA 11210: 105 days per pregnancy + 30-day unpaid extension
  if (leaveType === 'maternity_leave') {
    if (days > 135) {
      return 'Per RA 11210, maternity leave is up to 105 days, extendable by 30 days without pay (maximum 135 days).';
    }
  }

  // Study leave — CSC MC No. 14 s. 1999: 6 months (180 days), requires at least
  // one year of service, availed once per school year, with a return-service obligation.
  if (leaveType === 'study_leave') {
    if (days > 180) {
      return 'Per CSC MC No. 14 s. 1999, study leave may be granted for a maximum of six (6) months (180 days).';
    }
    if (!user.start_date) {
      return 'Study leave requires at least one (1) year of service — no appointment date is on file for this employee.';
    }
    const serviceYears = (start - new Date(user.start_date)) / (365.25 * 86400000);
    if (serviceYears < 1) {
      return 'Per CSC MC No. 14 s. 1999, study leave requires at least one (1) year of service.';
    }
    const existingStudyLeave = await LeaveRequest.findOne({
      user_id: user.user_id,
      leave_type: 'study_leave',
      status: { $nin: ['cancelled', 'disapproved'] }
    });
    if (existingStudyLeave) {
      return 'Study leave may be availed of only once per school year — you already have a study leave request on file.';
    }
  }

  // Wellness leave — CSC MC No. 1, s. 2026: maximum of five (5) days per calendar
  // year (non-cumulative, non-commutable, forfeited if unused), at most three (3)
  // consecutive days at a time, and applications must be filed at least five (5)
  // days before the intended date of availment (emergency cases: filed upon return).
  if (leaveType === 'wellness_leave') {
    if (days > 5) {
      return 'Per CSC MC No. 1, s. 2026, wellness leave is a maximum of five (5) days per calendar year.';
    }
    if (days > 3) {
      return 'Per CSC MC No. 1, s. 2026, wellness leave may be taken for a maximum of three (3) consecutive days at a time.';
    }
    const usedThisYear = await getYearlyLeaveDays(user.user_id, 'wellness_leave', year);
    if (usedThisYear + days > 5) {
      return `Per CSC MC No. 1, s. 2026, wellness leave is five (5) days per calendar year (non-cumulative and forfeited if unused). You have ${usedThisYear.toFixed(1)} day(s) used; this request would exceed the annual limit.`;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const daysAhead = Math.ceil((startDay - today) / 86400000);
    if (daysAhead < 5) {
      return 'Per CSC MC No. 1, s. 2026, wellness leave applications must be filed at least five (5) days before the intended date of availment (except in emergencies, when filing is done immediately upon return to work).';
    }
  }

  return null;
};

// Sum approved/pending days of a leave type in a calendar year (for annual caps)
const getYearlyLeaveDays = async (userId, leaveType, year) => {
  const requests = await LeaveRequest.find({
    user_id: userId,
    leave_type: leaveType,
    status: { $nin: ['cancelled', 'disapproved'] },
    start_date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59) }
  });
  return requests.reduce((sum, r) => sum + (r.number_of_days || 0), 0);
};

// @desc    Create a new leave request
// @route   POST /api/leave-requests
// @access  Private
const createLeaveRequest = async (req, res) => {
  try {
    const {
      leave_type,
      start_date,
      end_date,
      number_of_days,
      where_spent,
      commutation,
      location_specify,
      separation_type,
      is_half_day,
      role_based_approval,
      requester_role
    } = req.body;

    // Monetization / terminal leave have no inclusive dates (CSC MC No. 31: "No
    // inclusive dates shall be indicated" for monetization) — the employee enters
    // the number of days directly and keeps reporting for work. Dates default to the
    // filing date so the record still lands in the filing month.
    const isPurposeLeave = leave_type === 'monetization' || leave_type === 'terminal_leave';
    const filingDate = toDateStr(new Date());
    const effectiveStartDate = start_date || filingDate;
    const effectiveEndDate = end_date || filingDate;

    // Validate required fields (dates are only mandatory for actual leave-taking types)
    if (!leave_type || !number_of_days) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // For leave types that require location information, validate where_spent
    const needsLocation = 
      leave_type === 'vacation' || 
      leave_type === 'special_privilege_leave' || 
      leave_type === 'others_specify' || 
      leave_type === 'study_leave' || 
      leave_type === 'special_leave_benefits_women';

    if (needsLocation && !where_spent) {
      return res.status(400).json({
        success: false,
        message: 'Please provide where the leave will be spent'
      });
    }

    // Additional validation for 'others_specify' leave type
    if (leave_type === 'others_specify' && (!location_specify || !location_specify.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please specify the leave purpose for "Others" leave type'
      });
    }

    // Check for overlapping leave dates — not applicable to monetization / terminal
    // leave since no actual leave is taken (the employee keeps reporting for work).
    const hasOverlap = isPurposeLeave
      ? false
      : await hasOverlappingLeave(req.user.user_id, effectiveStartDate, effectiveEndDate);
    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave request for the selected dates. Please choose different dates.'
      });
    }

    // Half-day leave (Sec. 28): a single-date request filed as 0.5 working day.
    const isHalfDay = is_half_day === true || is_half_day === '1' || is_half_day === 'true';
    if (isHalfDay && effectiveStartDate !== effectiveEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Half-day leave applies to a single date only. Please select the same start and end date.'
      });
    }

    // CS Form 6 6.C counts WORKING days (Mon–Fri, inclusive, excluding non-working
    // holidays) — recompute authoritatively so the stored day count matches the form
    // even if the client computes differently. Purpose leaves (monetization / terminal)
    // are the exception: the number of days is entered directly by the employee and is
    // NOT derived from a date range (CSC MC No. 31). Half-day leaves are 0.5 by definition.
    const holidayDates = await getHolidayDatesForRange(effectiveStartDate, effectiveEndDate);
    const computedDays = isPurposeLeave
      ? null
      : isHalfDay
        ? 0.5
        : countWorkingDays(effectiveStartDate, effectiveEndDate, holidayDates);
    const effectiveNumberOfDays = computedDays !== null ? computedDays : parseFloat(number_of_days);

    // Check employee's leave credits
    const numberOfDaysFloat = parseFloat(effectiveNumberOfDays);

    // Purpose leaves need a concrete, positive whole-day count
    if (isPurposeLeave && (!Number.isFinite(numberOfDaysFloat) || numberOfDaysFloat < 1)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of days.'
      });
    }
    const leaveCreditsInfo = await getLeaveCreditsInfo(req.user.user_id, leave_type);

    // CSC Rule XVI, Sec. 22 (Omnibus Rules on Leave, CSC MC No. 41 s. 1998; Joint CSC-DBM Circular No. 2 s. 1997)
    // Monetization of leave credits:
    //   - eligible with at least 15 days accumulated vacation leave
    //   - minimum of 10 days, maximum of 30 days monetized in a given year
    //   - at least 5 days vacation leave must remain after monetization
    //   - availed of only once a year
    if (leave_type === 'monetization') {
      if (!Number.isInteger(numberOfDaysFloat) || numberOfDaysFloat < 10 || numberOfDaysFloat > 30) {
        return res.status(400).json({
          success: false,
          message: 'Per CSC rules (Sec. 22, Omnibus Rules on Leave), you may monetize a minimum of 10 days and a maximum of 30 days of vacation leave credits in a given year.'
        });
      }

      if (leaveCreditsInfo.availableCredits < 15) {
        return res.status(400).json({
          success: false,
          message: 'Per CSC rules, you must have at least 15 days of accumulated vacation leave credits to avail of monetization. Your current vacation leave balance is insufficient.'
        });
      }

      if (leaveCreditsInfo.availableCredits - numberOfDaysFloat < 5) {
        return res.status(400).json({
          success: false,
          message: `Per CSC rules, at least 5 days of vacation leave must remain after monetization. With your current balance of ${leaveCreditsInfo.availableCredits.toFixed(3)} days, you may monetize at most ${Math.max(0, Math.floor(leaveCreditsInfo.availableCredits - 5))} days.`
        });
      }

      // Availed only once a year (based on the year of the request's start date;
      // monetization defaults to the filing date when no dates are supplied)
      const monetizationYear = new Date(effectiveStartDate).getFullYear();
      const existingMonetization = await LeaveRequest.findOne({
        user_id: req.user.user_id,
        leave_type: 'monetization',
        status: { $ne: 'cancelled' },
        start_date: {
          $gte: new Date(monetizationYear, 0, 1),
          $lt: new Date(monetizationYear + 1, 0, 1)
        }
      });
      if (existingMonetization) {
        return res.status(400).json({
          success: false,
          message: 'Per CSC rules, monetization of leave credits may be availed of only once a year. You already have a monetization request this year.'
        });
      }
    }

    // Statutory eligibility limits (RA 8187 / RA 11210 / RA 8972 / CSC MC No. 14 s. 1999)
    const eligibilityError = await checkStatutoryEligibility(req.user, leave_type, numberOfDaysFloat, effectiveStartDate);
    if (eligibilityError) {
      return res.status(400).json({ success: false, message: eligibilityError });
    }

    // Terminal leave (CSC MC No. 14 s. 1999, as amended): granted only upon actual
    // retirement / resignation / separation from the service, commuting the FULL
    // accumulated vacation + sick leave balance. It may be availed of only once per
    // lifetime and is always paid (never marked without pay).
    if (leave_type === 'terminal_leave') {
      if (!['retirement', 'resignation', 'separation'].includes(separation_type)) {
        return res.status(400).json({
          success: false,
          message: 'Please indicate the separation context (retirement, resignation, or separation from the service) for your terminal leave request.'
        });
      }

      // CSC MC No. 14 s. 1999 (as amended): terminal leave commutes the FULL
      // accumulated vacation + sick leave balance — a partial amount is not allowed.
      if (Math.abs(numberOfDaysFloat - leaveCreditsInfo.availableCredits) > 0.001) {
        return res.status(400).json({
          success: false,
          message: `Per CSC MC No. 14 s. 1999 (as amended), terminal leave commutes your FULL accumulated vacation and sick leave balance (currently ${leaveCreditsInfo.availableCredits.toFixed(3)} days in total). Please file for the full ${leaveCreditsInfo.availableCredits.toFixed(3)} days.`
        });
      }

      // Availed of only once per lifetime — a terminal leave request stays on file until
      // the employee actually separates from the service.
      const existingTerminalLeave = await LeaveRequest.findOne({
        user_id: req.user.user_id,
        leave_type: 'terminal_leave',
        status: { $ne: 'cancelled' }
      });
      if (existingTerminalLeave) {
        return res.status(400).json({
          success: false,
          message: 'Terminal leave may be availed of only once, upon retirement or separation from the service. You already have a terminal leave request on file.'
        });
      }
    }

    let isWithoutPay = false;
    
    // Only auto-mark without pay for leave types that actually draw from vacation/sick
    // credits. Statutory leaves (maternity, paternity, etc.) and free-text "Others" types
    // are decided by the approver at 7.C of CS Form 6, so their pay status is not preset.
    // Monetization / terminal leave are cash conversions (CSC MC No. 31; MC No. 14 s. 1999),
    // so they are never without pay.
    if (!isPurposeLeave && leaveCreditsInfo.usesCredits !== false && numberOfDaysFloat > leaveCreditsInfo.maxAllowedDays) {
      // If employee has less than 1 credit, consider as no credits
      if (leaveCreditsInfo.maxAllowedDays < 1) {
        isWithoutPay = true;
      }
      // For partial credits, we'll let the client handle the adjustment
      // The server will just validate and store what the client sends
    }

    // Format where_spent based on location type
    let formattedWhereSpent = where_spent;
    if (where_spent === 'abroad' && location_specify) {
      formattedWhereSpent = location_specify;
    } else if (where_spent === 'outpatient' && location_specify) {
      formattedWhereSpent = `Outpatient: ${location_specify}`;
    }

    // Determine the initial status based on role-based approval logic
    let initialStatus = 'pending'; // default for regular employees
    let targetApprover = null;
    let targetApproverType = null;

    // Check if this is a role-based approval request
    if (role_based_approval && requester_role) {
      if (req.user.user_type === 'department_admin' || requester_role === 'department_admin') {
        // Department admin: go directly to HR
        initialStatus = 'recommended'; // Skip department approval, go to HR
        targetApproverType = 'hr';
      } else if (req.user.user_type === 'hr' || requester_role === 'hr') {
        // HR manager: go directly to mayor
        initialStatus = 'hr_approved'; // Skip HR approval, go to mayor
        targetApproverType = 'mayor';
      } else if (req.user.user_type === 'mayor' || requester_role === 'mayor') {
        // Mayor: auto-approved
        initialStatus = 'approved';
        targetApproverType = null; // No further approval needed
      }
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      user_id: req.user.user_id, // Use user_id from authenticated user
      leave_type,
      start_date: effectiveStartDate,
      end_date: effectiveEndDate,
      number_of_days: parseFloat(effectiveNumberOfDays),
      is_half_day: isHalfDay,
      // Sec. 53: sick leave in excess of five (5) successive days needs a medical certificate
      medical_certificate_required: requiresMedicalCertificate({ leave_type, start_date: effectiveStartDate, end_date: effectiveEndDate }),
      // Sec. 25: track the calendar year this mandatory/forced leave counts toward
      forced_leave_year: leave_type === 'mandatory_forced_leave' ? new Date(effectiveStartDate).getFullYear() : undefined,
      where_spent: formattedWhereSpent,
      // Monetization / terminal leave ARE commutation (cash conversions per CSC MC No. 31
      // and MC No. 14 s. 1999) — commutation is always requested for these types.
      commutation: isPurposeLeave ? true : (commutation === '1' || commutation === true),
      without_pay: isWithoutPay,
      separation_type: leave_type === 'terminal_leave' ? separation_type : undefined,
      status: initialStatus
    });

    const savedLeaveRequest = await leaveRequest.save();

    // Handle notifications based on role-based approval
    try {
      // Get the user object for the notification
      const user = await User.findOne({ user_id: req.user.user_id });
      
      // If this is a role-based approval request, send notifications accordingly
      if (role_based_approval && requester_role) {
        // Populate user data for the notification
        const populatedLeaveRequest = await LeaveRequest.findById(savedLeaveRequest._id)
          .populate({
            path: 'user_id',
            select: 'first_name last_name middle_initial department_id position user_id',
            foreignField: 'user_id',
            localField: 'user_id',
            populate: {
              path: 'department_id',
              select: 'name'
            }
          });

        // Send notifications based on the requester's role
        if (requester_role === 'department_admin' || req.user.user_type === 'department_admin') {
          // Find HR user to notify
          const hrUsers = await User.find({ user_type: 'hr' });
          for (const hrUser of hrUsers) {
            await sendRecommendedLeaveRequestNotification(populatedLeaveRequest, hrUser._id);
          }
        } else if (requester_role === 'hr' || req.user.user_type === 'hr') {
          // Find mayor user to notify
          const mayorUsers = await User.find({ user_type: 'mayor' });
          for (const mayorUser of mayorUsers) {
            await sendHrApprovedLeaveRequestNotification(populatedLeaveRequest, mayorUser._id);
          }
        } else if (requester_role === 'mayor' || req.user.user_type === 'mayor') {
          // For mayor auto-approval, notify the mayor themselves and employees
          await sendLeaveStatusUpdateToEmployee(populatedLeaveRequest, 'mayor_approved');
        }
      } else {
        // For regular employees, send notification to department admin as before
        if (user && user.department_id) {
          // Find department admin for this department
          const departmentAdmin = await User.findOne({ 
            user_type: 'department_admin', 
            department_id: user.department_id 
          });
          
          if (departmentAdmin) {
            // Populate user data for the notification
            const populatedLeaveRequest = await LeaveRequest.findById(savedLeaveRequest._id)
              .populate({
                path: 'user_id',
                select: 'first_name last_name middle_initial department_id position user_id',
                foreignField: 'user_id',
                localField: 'user_id',
                populate: {
                  path: 'department_id',
                  select: 'name'
                }
              });
              
            // Make sure user data is available before sending notification
            if (populatedLeaveRequest && populatedLeaveRequest.user_id) {
              await sendNewLeaveRequestNotification(populatedLeaveRequest, departmentAdmin._id);
            }
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    // Prepare response with warning if applicable
    const response = {
      success: true,
      message: initialStatus === 'approved' 
        ? 'Leave request submitted and automatically approved' 
        : 'Leave request submitted successfully',
      data: savedLeaveRequest
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing leave request'
    });
  }
};

// @desc    Get all leave requests for a user
// @route   GET /api/leave-requests
// @access  Private
const getLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.find({ user_id: req.user.user_id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave requests'
    });
  }
};

// @desc    Get a specific leave request
// @route   GET /api/leave-requests/:id
// @access  Private
const getLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if user owns this leave request
    // After population, leaveRequest.user_id is an object with a user_id field
    const requestUserId = leaveRequest.user_id && typeof leaveRequest.user_id === 'object' 
      ? leaveRequest.user_id.user_id 
      : leaveRequest.user_id;
      
    if (requestUserId !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this leave request'
      });
    }

    res.json({
      success: true,
      data: leaveRequest
    });
  } catch (error) {
    console.error('Error fetching leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave request'
    });
  }
};

// Helper function to return leave credits when a leave is cancelled
const returnLeaveCredits = async (leaveRequest) => {
  try {
    // Get the month and year when the leave was scheduled (not current date)
    const leaveDate = new Date(leaveRequest.start_date);
    const leaveMonth = leaveDate.getMonth() + 1; // getMonth() is zero-based
    const leaveYear = leaveDate.getFullYear();

    // Get the actual user_id from the leave request (handle both populated and non-populated cases)
    const userId = leaveRequest.user_id && typeof leaveRequest.user_id === 'object' 
      ? leaveRequest.user_id.user_id 
      : leaveRequest.user_id;

    // Find the corresponding leave record
    const leaveRecord = await LeaveRecord.findOne({
      user_id: userId,
      month: leaveMonth,
      year: leaveYear
    });

    if (!leaveRecord) {
      // If no record exists for this month, nothing to return
      return;
    }

    // For terminal leave, return the approved split — vacation credits were consumed
    // first, the remainder from sick credits (CSC: full VL + SL balance is commuted).
    if (leaveRequest.leave_type === 'terminal_leave') {
      const vacationReturn = leaveRequest.vacation_days ?? leaveRequest.number_of_days;
      const sickReturn = leaveRequest.sick_days ?? 0;
      leaveRecord.vacation_used = Math.max(0, leaveRecord.vacation_used - vacationReturn);
      // Recalculate balance based on earned minus used
      leaveRecord.vacation_balance = leaveRecord.vacation_earned - leaveRecord.vacation_used;
      if (sickReturn > 0) {
        leaveRecord.sick_used = Math.max(0, leaveRecord.sick_used - sickReturn);
        leaveRecord.sick_balance = leaveRecord.sick_earned - leaveRecord.sick_used;
      }
    }
    // For vacation-type leaves (incl. monetization) - return credits from vacation credits
    else if (leaveRequest.leave_type === 'vacation' ||
        leaveRequest.leave_type === 'monetization') {
      // Return the deducted days back to vacation credits
      leaveRecord.vacation_used = Math.max(0, leaveRecord.vacation_used - leaveRequest.number_of_days);
      // Recalculate balance based on earned minus used
      leaveRecord.vacation_balance = leaveRecord.vacation_earned - leaveRecord.vacation_used;
    }
    // For sick leave - return credits from sick credits (or from vacation when the
    // leave was charged to vacation via the Sec. 56 one-way draw)
    else if (leaveRequest.leave_type === 'sick') {
      if (leaveRequest.charged_to === 'vacation') {
        leaveRecord.vacation_used = Math.max(0, leaveRecord.vacation_used - leaveRequest.number_of_days);
        leaveRecord.vacation_balance = leaveRecord.vacation_earned - leaveRecord.vacation_used;
      } else {
        leaveRecord.sick_used = Math.max(0, leaveRecord.sick_used - leaveRequest.number_of_days);
        leaveRecord.sick_balance = leaveRecord.sick_earned - leaveRecord.sick_used;
      }
    }

    // Instead of removing the entry, mark it as cancelled in the entries array
    if (leaveRecord.vacation_entries && Array.isArray(leaveRecord.vacation_entries)) {
      const leaveStartDate = new Date(leaveRequest.start_date).toISOString().split('T')[0];
      const leaveEndDate = new Date(leaveRequest.end_date).toISOString().split('T')[0];
      
      leaveRecord.vacation_entries = leaveRecord.vacation_entries.map(entry => 
        (entry.start_date === leaveStartDate && 
         entry.end_date === leaveEndDate &&
         entry.days === leaveRequest.number_of_days &&
         entry.type === leaveRequest.leave_type) 
          ? { ...entry, cancelled: true, status: 'cancelled' } // Mark as cancelled instead of removing
          : entry
      );
    }
    if (leaveRecord.sick_entries && Array.isArray(leaveRecord.sick_entries)) {
      const leaveStartDate = new Date(leaveRequest.start_date).toISOString().split('T')[0];
      const leaveEndDate = new Date(leaveRequest.end_date).toISOString().split('T')[0];
      
      leaveRecord.sick_entries = leaveRecord.sick_entries.map(entry => 
        (entry.start_date === leaveStartDate && 
         entry.end_date === leaveEndDate &&
         entry.days === leaveRequest.number_of_days &&
         entry.type === leaveRequest.leave_type) 
          ? { ...entry, cancelled: true, status: 'cancelled' } // Mark as cancelled instead of removing
          : entry
      );
    }

    // If it was a leave without pay, reduce the LWOP days as well
    if (leaveRequest.without_pay) {
      leaveRecord.lwop_days = Math.max(0, (leaveRecord.lwop_days || 0) - leaveRequest.number_of_days);
    }

    await leaveRecord.save();
  } catch (error) {
    console.error('Error returning leave credits:', error);
    throw error;
  }
};

// @desc    Cancel a leave request
// @route   DELETE /api/leave-requests/:id
// @access  Private
const cancelLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if user owns this leave request
    // After population, leaveRequest.user_id is an object with a user_id field
    const requestUserId = leaveRequest.user_id && typeof leaveRequest.user_id === 'object' 
      ? leaveRequest.user_id.user_id 
      : leaveRequest.user_id;
      
    if (requestUserId !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this leave request'
      });
    }

    // Check if the leave request can be cancelled
    // Allow cancellation even after approval
    const cancellableStatuses = ['pending', 'recommended', 'hr_approved', 'approved'];
    if (!cancellableStatuses.includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'This leave request cannot be cancelled at this stage'
      });
    }

    // If the leave request was approved, we need to return the credits
    if (leaveRequest.status === 'approved') {
      await returnLeaveCredits(leaveRequest);
    }

    // Update status to cancelled
    leaveRequest.status = 'cancelled';
    const updatedLeaveRequest = await leaveRequest.save();

    res.json({
      success: true,
      message: 'Leave request has been successfully cancelled and credits have been returned',
      data: updatedLeaveRequest
    });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling leave request'
    });
  }
};

// Helper to check if the authenticated user owns a leave request
const isOwnerOfLeaveRequest = (leaveRequest, userId) => {
  const requestUserId = leaveRequest.user_id && typeof leaveRequest.user_id === 'object'
    ? leaveRequest.user_id.user_id
    : leaveRequest.user_id;
  return requestUserId === userId;
};

// @desc    Upload supporting documents to a leave request
// @route   POST /api/leave-requests/:id/documents
// @access  Private (owner or HR)
const uploadLeaveDocuments = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only the owner (employee) or HR can attach documents
    const isOwner = isOwnerOfLeaveRequest(leaveRequest, req.user.user_id);
    const isHr = req.user.user_type === 'hr';
    if (!isOwner && !isHr) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload documents to this leave request'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const newDocuments = req.files.map(file => ({
      name: file.originalname,
      url: file.path,
      public_id: file.filename || null,
      resource_type: file.mimetype.startsWith('image/') ? 'image' : 'raw',
      mimetype: file.mimetype,
      size: file.size,
      uploaded_at: new Date()
    }));

    leaveRequest.documents = [...(leaveRequest.documents || []), ...newDocuments];
    await leaveRequest.save();

    res.status(201).json({
      success: true,
      message: `${newDocuments.length} document(s) uploaded successfully`,
      documents: leaveRequest.documents
    });
  } catch (error) {
    console.error('Error uploading leave documents:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading documents: ' + (error.message || '')
    });
  }
};

// @desc    Delete a document from a leave request
// @route   DELETE /api/leave-requests/:id/documents/:docId
// @access  Private (owner or HR)
const deleteLeaveDocument = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const isOwner = isOwnerOfLeaveRequest(leaveRequest, req.user.user_id);
    const isHr = req.user.user_type === 'hr';
    if (!isOwner && !isHr) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete documents from this leave request'
      });
    }

    const documents = leaveRequest.documents || [];
    const docIndex = documents.findIndex(doc => doc._id.toString() === req.params.docId);

    if (docIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const deletedDoc = documents[docIndex];
    documents.splice(docIndex, 1);
    leaveRequest.documents = documents;
    await leaveRequest.save();

    // Best-effort cleanup of the file (Cloudinary first, local disk fallback for legacy files)
    if (deletedDoc) {
      if (deletedDoc.public_id) {
        try {
          await cloudinary.uploader.destroy(deletedDoc.public_id, {
            resource_type: deletedDoc.resource_type || 'raw'
          });
        } catch (cloudErr) {
          console.error('Error deleting file from Cloudinary:', cloudErr);
        }
      } else if (deletedDoc.url && deletedDoc.url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', deletedDoc.url);
        fs.unlink(filePath, () => {});
      }
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
      documents: leaveRequest.documents
    });
  } catch (error) {
    console.error('Error deleting leave document:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting document'
    });
  }
};

// @desc    Get leave requests for the team calendar (who's on leave)
// @route   GET /api/leave-requests/calendar?month=&year=&department_id=
// @access  Private (HR sees all; department admin sees own department)
const getLeaveCalendar = async (req, res) => {
  try {
    const { month, year, department_id } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const m = parseInt(month);
    const y = parseInt(year);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

    // Department scope: explicit filter, HR default all, department admin defaults to own dept
    let deptId = department_id && department_id !== 'all' ? department_id : null;
    if (!deptId && req.user.user_type === 'department_admin') {
      deptId = req.user.department_id ? (req.user.department_id._id || req.user.department_id) : null;
    }

    const userQuery = deptId ? { department_id: deptId } : {};
    const users = await User.find(userQuery)
      .select('user_id first_name last_name middle_initial department_id position appointment_status');
    const userIds = users.map(u => u.user_id);

    // Monetization / terminal leave are excluded — no actual leave is taken, so the
    // employee is not "out" on those dates (CSC MC No. 31).
    const requests = await LeaveRequest.find({
      user_id: { $in: userIds },
      status: { $nin: ['cancelled', 'disapproved'] },
      leave_type: { $nin: ['monetization', 'terminal_leave'] },
      start_date: { $lte: monthEnd },
      end_date: { $gte: monthStart }
    }).sort({ start_date: 1 });

    const userMap = {};
    users.forEach(u => { userMap[u.user_id] = u; });

    const events = requests.map(r => {
      // LeaveRequest auto-populates user_id into a full user object on find()
      const rawUserId = r.user_id && typeof r.user_id === 'object' ? r.user_id.user_id : r.user_id;
      const u = userMap[rawUserId] || {};
      const dept = u.department_id ? (u.department_id.name || u.department_id) : null;
      return {
        _id: r._id,
        leave_type: r.leave_type,
        status: r.status,
        start_date: r.start_date,
        end_date: r.end_date,
        number_of_days: r.number_of_days,
        user_id: rawUserId,
        employee_name: `${u.first_name || ''}${u.middle_initial ? ' ' + u.middle_initial + '.' : ''} ${u.last_name || ''}`.trim(),
        department: dept,
        department_id: u.department_id ? (u.department_id._id || u.department_id) : null,
        without_pay: r.without_pay
      };
    });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching leave calendar:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching leave calendar' });
  }
};

// @desc    Upload the official signed PDF of a leave request
// @route   POST /api/leave-requests/:id/official-pdf
// @access  Private (owner, HR, department admin, mayor)
const uploadOfficialPdf = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const isOwner = isOwnerOfLeaveRequest(leaveRequest, req.user.user_id);
    const isHr = req.user.user_type === 'hr';
    const isDeptAdmin = req.user.user_type === 'department_admin';
    const isMayor = req.user.user_type === 'mayor';
    if (!isOwner && !isHr && !isDeptAdmin && !isMayor) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload the signed PDF' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const actorName = `${req.user.first_name || ''}${req.user.middle_initial ? ' ' + req.user.middle_initial + '.' : ''} ${req.user.last_name || ''}`.trim();

    leaveRequest.official_pdf = {
      url: req.file.path,
      public_id: req.file.filename || null,
      name: req.file.originalname,
      uploaded_at: new Date(),
      uploaded_by: req.user.user_id,
      uploaded_by_name: actorName
    };
    await leaveRequest.save();

    res.status(201).json({
      success: true,
      message: 'Signed PDF uploaded successfully',
      official_pdf: leaveRequest.official_pdf
    });
  } catch (error) {
    console.error('Error uploading official PDF:', error);
    res.status(500).json({ success: false, message: 'Server error while uploading signed PDF: ' + (error.message || '') });
  }
};

// @desc    Remove the official signed PDF of a leave request
// @route   DELETE /api/leave-requests/:id/official-pdf
// @access  Private (owner, HR, department admin, mayor)
const deleteOfficialPdf = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const isOwner = isOwnerOfLeaveRequest(leaveRequest, req.user.user_id);
    const isHr = req.user.user_type === 'hr';
    const isDeptAdmin = req.user.user_type === 'department_admin';
    const isMayor = req.user.user_type === 'mayor';
    if (!isOwner && !isHr && !isDeptAdmin && !isMayor) {
      return res.status(403).json({ success: false, message: 'Not authorized to remove the signed PDF' });
    }

    const oldPdf = leaveRequest.official_pdf;
    if (!oldPdf || !oldPdf.url) {
      return res.status(404).json({ success: false, message: 'No signed PDF attached' });
    }

    // $unset cleanly removes the field (assigning undefined can leave an empty {} behind)
    await LeaveRequest.updateOne({ _id: leaveRequest._id }, { $unset: { official_pdf: 1 } });

    // Best-effort cleanup of the file (Cloudinary for new uploads)
    if (oldPdf.public_id) {
      try {
        await cloudinary.uploader.destroy(oldPdf.public_id, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.error('Error deleting signed PDF from Cloudinary:', cloudErr);
      }
    } else if (oldPdf.url && oldPdf.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', oldPdf.url);
      fs.unlink(filePath, () => {});
    }

    res.json({ success: true, message: 'Signed PDF removed successfully' });
  } catch (error) {
    console.error('Error removing official PDF:', error);
    res.status(500).json({ success: false, message: 'Server error while removing signed PDF' });
  }
};

// @desc    Update digital signatures on a leave request
// @route   POST /api/leave-requests/:id/signatures
// @access  Private
const updateSignatures = async (req, res) => {
  try {
    const { applicant_signature, hr_signature, department_signature, mayor_signature } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Only plain raster image data URLs are accepted — SVG/HTML payloads or any
    // other string must never be stored as a signature.
    const isValidSignature = (s) =>
      s === undefined || s === '' || /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(s);

    if (![applicant_signature, hr_signature, department_signature, mayor_signature].every(isValidSignature)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature format. Only PNG or JPG images are allowed.'
      });
    }

    if (applicant_signature !== undefined) leaveRequest.applicant_signature = applicant_signature;
    if (hr_signature !== undefined) leaveRequest.hr_signature = hr_signature;
    if (department_signature !== undefined) leaveRequest.department_signature = department_signature;
    if (mayor_signature !== undefined) leaveRequest.mayor_signature = mayor_signature;

    await leaveRequest.save();

    res.json({
      success: true,
      message: 'Signatures updated successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Error updating signatures:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating signatures'
    });
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequest,
  getLeaveCalendar,
  cancelLeaveRequest,
  updateSignatures,
  uploadLeaveDocuments,
  deleteLeaveDocument,
  uploadOfficialPdf,
  deleteOfficialPdf
};