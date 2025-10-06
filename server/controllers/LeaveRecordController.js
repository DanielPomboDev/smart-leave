const LeaveRecord = require('../models/LeaveRecord');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveApproval = require('../models/LeaveApproval');
const { createLeaveRecordValidation, updateLeaveRecordValidation, addUndertimeValidation } = require('../middleware/leaveRecordValidation');

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
      return false;
    }
    
    // Calculate cumulative balance
    const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                          allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
    
    const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                       allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
    
    // Determine available credits based on leave type
    const availableCredits = leaveType === 'vacation' ? vacationBalance : sickBalance;
    
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
        maxAllowedDays: 0
      };
    }
    
    // Calculate cumulative balance
    const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                          allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
    
    const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                       allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
    
    // Determine available credits based on leave type
    const availableCredits = leaveType === 'vacation' ? vacationBalance : sickBalance;
    
    return {
      hasSufficientCredits: availableCredits >= 1, // Consider less than 1 as no credits
      availableCredits: availableCredits,
      maxAllowedDays: Math.floor(availableCredits * 1000) / 1000 // Round to 3 decimal places
    };
  } catch (error) {
    console.error('Error checking leave credits:', error);
    // If there's an error, we'll allow the request to proceed to avoid blocking users
    return {
      hasSufficientCredits: true,
      availableCredits: 0,
      maxAllowedDays: 0
    };
  }
};

// Get all leave records with optional filtering
exports.index = async (req, res) => {
  try {
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
    const { userId } = req.params;
    
    // Find the employee by user_id field (not MongoDB _id)
    const employee = await User.findOne({ user_id: userId }).populate('department_id');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get leave records for this employee, ordered by year/month ascending
    const allLeaveRecords = await LeaveRecord.find({ user_id: employee.user_id })
      .sort({ year: 1, month: 1 })
      .exec();
    
    let vacationBalance = 0;
    let sickBalance = 0;

    const processedRecords = allLeaveRecords.map(record => {
      vacationBalance += record.vacation_earned - record.vacation_used;
      sickBalance += record.sick_earned - record.sick_used;
      
      return {
        ...record.toObject(),
        vacation_balance: vacationBalance,
        sick_balance: sickBalance
      };
    });

    // Group by year, sorted descending
    const leaveRecords = {};
    processedRecords.reverse().forEach(record => {
      if (!leaveRecords[record.year]) {
        leaveRecords[record.year] = [];
      }
      leaveRecords[record.year].push(record);
    });
    
    // Calculate summary totals
    const vacationSummary = {
      earned: allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0),
      used: allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0),
      balance: vacationBalance
    };
    
    const sickSummary = {
      earned: allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0),
      used: allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0),
      balance: sickBalance
    };
    
    res.json({
      employee,
      leaveRecords,
      vacationSummary,
      sickSummary
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave records', error: error.message });
  }
};

// Get leave record for a specific month/year for an employee
exports.getMonthlyRecord = async (req, res) => {
  try {
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

// Create a new leave record
exports.store = async (req, res) => {
  try {
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
    
    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error creating leave record', error: error.message });
  }
};

// Update a leave record
exports.update = async (req, res) => {
  try {
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
    
    // Update fields if provided
    if (vacation_earned !== undefined) leaveRecord.vacation_earned = vacation_earned;
    if (vacation_used !== undefined) leaveRecord.vacation_used = vacation_used;
    if (sick_earned !== undefined) leaveRecord.sick_earned = sick_earned;
    if (sick_used !== undefined) leaveRecord.sick_used = sick_used;
    if (undertime_hours !== undefined) leaveRecord.undertime_hours = undertime_hours;
    if (vacation_entries !== undefined) leaveRecord.vacation_entries = vacation_entries;
    if (sick_entries !== undefined) leaveRecord.sick_entries = sick_entries;
    
    // Recalculate balances
    leaveRecord.vacation_balance = leaveRecord.vacation_earned - leaveRecord.vacation_used;
    leaveRecord.sick_balance = leaveRecord.sick_earned - leaveRecord.sick_used;
    
    const updatedRecord = await leaveRecord.save();
    
    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error updating leave record', error: error.message });
  }
};

// Add undertime to a leave record
exports.addUndertime = async (req, res) => {
  try {
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
        undertime_hours: undertimeToAdd
      });

      await leaveRecord.save();
    }

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

// Calculate and award monthly leave credits
exports.calculateCredits = async (req, res) => {
    const { month, year } = req.body;

    if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
    }

    try {
        const users = await User.find();

        for (const user of users) {
            // Calculate LWOP days
            const leaveRequests = await LeaveRequest.find({
                user_id: user.user_id,
                status: 'approved',
                start_date: {
                    $gte: new Date(year, month - 1, 1),
                    $lt: new Date(year, month, 1)
                }
            });

            let lwopDays = 0;
            for (const req of leaveRequests) {
                const approval = await LeaveApproval.findOne({ 
                    leave_id: req._id, 
                    approval: 'approve', 
                    approved_for: 'without_pay' 
                });
                if (approval) {
                    lwopDays += req.number_of_days;
                }
            }

            // Get or create leave record
            let leaveRecord = await LeaveRecord.findOne({ user_id: user.user_id, month, year });
            if (!leaveRecord) {
                leaveRecord = new LeaveRecord({
                    user_id: user.user_id,
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

            // Calculate prorated credits
            const workingDaysInMonth = 30;
            const daysPresent = Math.max(0, workingDaysInMonth - lwopDays);
            const proratedVacationCredits = getProratedCredits(daysPresent, lwopDays);

            // Update leave record
            leaveRecord.lwop_days = lwopDays;
            leaveRecord.vacation_earned = proratedVacationCredits;
            leaveRecord.sick_earned = 1.250;

            // Get previous month's balance
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const prevRecord = await LeaveRecord.findOne({ user_id: user.user_id, month: prevMonth, year: prevYear });

            const prevVacationBalance = prevRecord ? prevRecord.vacation_balance : 0;
            const prevSickBalance = prevRecord ? prevRecord.sick_balance : 0;

            leaveRecord.vacation_balance = prevVacationBalance + proratedVacationCredits - leaveRecord.vacation_used;
            leaveRecord.sick_balance = prevSickBalance + 1.250 - leaveRecord.sick_used;

            await leaveRecord.save();
        }

        res.json({ success: true, message: 'Leave credits calculated successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error calculating leave credits', error: error.message });
    }
};