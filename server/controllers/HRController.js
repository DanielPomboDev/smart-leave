const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Department = require('../models/Department');
const LeaveRecommendation = require('../models/LeaveRecommendation');
const LeaveApproval = require('../models/LeaveApproval');
const LeaveRecord = require('../models/LeaveRecord');
const { sendHrApprovedLeaveRequestNotification, sendLeaveStatusUpdateToEmployee, sendLeaveStatusUpdateToDepartmentAdmin } = require('../utils/notificationUtils');
const { NOTIFICATION_TYPES } = require('../utils/notificationUtils');

// @desc    Get HR dashboard statistics
// @route   GET /api/hr/dashboard
// @access  Private (HR only)
const getHRDashboardStats = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    // Get statistics
    const pendingCount = await LeaveRequest.countDocuments({
      status: 'pending'
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    
    const approvedThisMonthCount = await LeaveRequest.countDocuments({
      status: 'approved',
      updatedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    
    const rejectedThisMonthCount = await LeaveRequest.countDocuments({
      status: 'disapproved',
      updatedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    
    const totalEmployeesCount = await User.countDocuments();

    // Get recent leave requests for HR queue (recommended, HR-approved, approved, and cancelled)
    const hrQueue = await LeaveRequest.find({
      status: { $in: ['recommended', 'hr_approved', 'approved', 'cancelled'] }
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      stats: {
        pending: pendingCount,
        approved_this_month: approvedThisMonthCount,
        rejected_this_month: rejectedThisMonthCount,
        total_employees: totalEmployeesCount
      },
      leaveRequests: hrQueue
    });
  } catch (error) {
    console.error('Error fetching HR dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Get all departments
// @route   GET /api/hr/departments
// @access  Private (HR only)
const getHRDepartments = async (req, res) => {
  try {
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const departments = await Department.find().sort({ name: 1 });

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching departments'
    });
  }
};

// @desc    Create a department
// @route   POST /api/hr/departments
// @access  Private (HR only)
const createDepartment = async (req, res) => {
  try {
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check for duplicate
    const existing = await Department.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name already exists'
      });
    }

    const department = new Department({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    await department.save();

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating department'
    });
  }
};

// @desc    Update a department
// @route   PUT /api/hr/departments/:id
// @access  Private (HR only)
const updateDepartment = async (req, res) => {
  try {
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required'
      });
    }

    // Check for duplicate (excluding current department)
    const existing = await Department.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name.trim()}$`, 'i')
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name already exists'
      });
    }

    const department = await Department.findByIdAndUpdate(
      id,
      { name: name.trim(), description: description ? description.trim() : '' },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating department'
    });
  }
};

// @desc    Delete a department
// @route   DELETE /api/hr/departments/:id
// @access  Private (HR only)
const deleteDepartment = async (req, res) => {
  try {
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;

    // Check if any users are assigned to this department
    const userCount = await User.countDocuments({ department_id: id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. ${userCount} employee(s) are assigned to it. Reassign them first.`
      });
    }

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting department'
    });
  }
};

// @desc    Get HR leave requests with filtering
// @route   GET /api/hr/leave-requests
// @access  Private (HR only)
const getHRLeaveRequests = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    // Get filter parameters
    const { status = 'all', department = 'all', date_range = 'all', search = '' } = req.query;

    // Build the query conditions
    let conditions = {};

    // Apply status filter
    if (status !== 'all') {
      const statusMap = {
        'recommended': 'recommended',
        'hr_approved': 'hr_approved',
        'approved': 'approved',
        'disapproved': 'disapproved',
        'cancelled': 'cancelled'
      };
      
      if (statusMap[status]) {
        conditions.status = statusMap[status];
      }
    } else {
      // Exclude 'pending' status when 'all' is selected
      conditions.status = { $ne: 'pending' };
    }

    // Apply department filter
    let userConditions = {};
    if (department !== 'all') {
      userConditions.department_id = department;
    }

    // Apply search filter
    if (search) {
      userConditions.$or = [
        { first_name: new RegExp(search, 'i') },
        { last_name: new RegExp(search, 'i') },
        { user_id: new RegExp(search, 'i') }
      ];
    }

    // Apply date range filter
    if (date_range !== 'all') {
      const now = new Date();
      let startDate, endDate;
      
      switch (date_range) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
      }
      
      if (startDate && endDate) {
        conditions.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // First, get users matching the user conditions
    let userIds = [];
    if (Object.keys(userConditions).length > 0) {
      const users = await User.find(userConditions).select('user_id');
      userIds = users.map(user => user.user_id);
      conditions.user_id = { $in: userIds };
    }

    // Get leave requests with populated user and department info
    const leaveRequests = await LeaveRequest.find(conditions)
      .populate({
        path: 'user_id',
        select: 'first_name last_name middle_initial department_id position user_id',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaveRequests
    });
  } catch (error) {
    console.error('Error fetching HR leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave requests'
    });
  }
};

// @desc    Get a specific HR leave request
// @route   GET /api/hr/leave-requests/:id
// @access  Private (HR only)
const getHRLeaveRequest = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    console.log('HR Leave Request - User:', req.user);
    if (!req.user || req.user.user_type !== 'hr') {
      console.log('HR Leave Request - Unauthorized access attempt:', {
        user: req.user,
        userType: req.user?.user_type
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;

    // Get the leave request with user and department information
    const leaveRequest = await LeaveRequest.findById(id).populate({
      path: 'user_id',
      select: 'first_name last_name middle_initial department_id position user_id profile_image salary',
      populate: {
        path: 'department_id',
        select: 'name'
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Get recommendations for this leave request
    const recommendations = await LeaveRecommendation.find({ leave_id: id })
      .populate({
        path: 'department_admin_id',
        select: 'first_name last_name',
        foreignField: 'user_id',  // Match User's user_id field instead of _id
        localField: 'department_admin_id'  // Use LeaveRecommendation's department_admin_id field
      });

    // Attach recommendations to the leave request object
    const leaveRequestWithRecommendations = leaveRequest.toObject();
    leaveRequestWithRecommendations.recommendations = recommendations;

    // Check if employee had sufficient leave credits when submitting the request
    const { getLeaveCreditsInfo } = require('./LeaveRecordController');
    const numberOfDays = parseFloat(leaveRequest.number_of_days);
    const leaveCreditsInfo = await getLeaveCreditsInfo(leaveRequest.user_id.user_id, leaveRequest.leave_type);
    const hasSufficientCredits = leaveCreditsInfo.hasSufficientCredits;
    
    // Get all leave records for this user to calculate cumulative balance
    const allLeaveRecords = await LeaveRecord
      .find({ user_id: leaveRequestWithRecommendations.user_id.user_id })
      .sort({ year: -1, month: -1 })
      .exec();
    
    // Add leave balance information to the user object
    if (allLeaveRecords.length > 0) {
      // Calculate cumulative balance
      const vacationBalance = allLeaveRecords.reduce((sum, record) => sum + record.vacation_earned, 0) - 
                            allLeaveRecords.reduce((sum, record) => sum + record.vacation_used, 0);
      
      const sickBalance = allLeaveRecords.reduce((sum, record) => sum + record.sick_earned, 0) - 
                         allLeaveRecords.reduce((sum, record) => sum + record.sick_used, 0);
      
      leaveRequestWithRecommendations.user_id.vacation_balance = vacationBalance;
      leaveRequestWithRecommendations.user_id.sick_balance = sickBalance;

      // Totals used for the 7.A Certification of Leave Credits table
      leaveRequestWithRecommendations.user_id.vacation_earned_total = allLeaveRecords.reduce((sum, record) => sum + (record.vacation_earned || 0), 0);
      leaveRequestWithRecommendations.user_id.vacation_used_total   = allLeaveRecords.reduce((sum, record) => sum + (record.vacation_used   || 0), 0);
      leaveRequestWithRecommendations.user_id.sick_earned_total     = allLeaveRecords.reduce((sum, record) => sum + (record.sick_earned     || 0), 0);
      leaveRequestWithRecommendations.user_id.sick_used_total       = allLeaveRecords.reduce((sum, record) => sum + (record.sick_used       || 0), 0);
    } else {
      // Default balances if no record exists
      leaveRequestWithRecommendations.user_id.vacation_balance = 0;
      leaveRequestWithRecommendations.user_id.sick_balance = 0;
      leaveRequestWithRecommendations.user_id.vacation_earned_total = 0;
      leaveRequestWithRecommendations.user_id.vacation_used_total = 0;
      leaveRequestWithRecommendations.user_id.sick_earned_total = 0;
      leaveRequestWithRecommendations.user_id.sick_used_total = 0;
    }

    res.json({
      success: true,
      leaveRequest: leaveRequestWithRecommendations,
      hasSufficientCredits
    });
  } catch (error) {
    console.error('Error fetching HR leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave request'
    });
  }
};

// @desc    Process HR leave approval
// @route   POST /api/hr/leave-requests/:id/approve
// @access  Private (HR only)
const processHRLeaveApproval = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { id } = req.params;
    const { approval, approved_for, approved_for_other, disapproved_due_to, credits_certified } = req.body;

    const leaveRequest = await LeaveRequest.findById(id).populate('user_id');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Must be recommended and have an approved recommendation
    if (leaveRequest.status !== 'recommended') {
      return res.status(400).json({
        success: false,
        message: 'This leave request is not yet recommended by the department.'
      });
    }

    // Check if an approval already exists for this leave request and HR manager
    const existingApproval = await LeaveApproval.findOne({
      leave_id: id,
      hr_manager_id: req.user.user_id
    });
    
    if (existingApproval) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an approval for this leave request.'
      });
    }

    // Validate the request
    if (!approval || !['approve', 'disapprove'].includes(approval)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid approval decision (approve or disapprove)'
      });
    }

    if (approval === 'disapprove' && !disapproved_due_to) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for disapproval'
      });
    }

    // If approving, validate the approved_for field
    if (approval === 'approve') {
      if (!approved_for || !['with_pay', 'without_pay', 'others'].includes(approved_for)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid approval type (with_pay, without_pay, or others)'
        });
      }
      
      // 7.A Certification of Leave Credits is part of the HR approval process
      if (approved_for === 'with_pay' || approved_for === 'others') {
        if (!credits_certified) {
          return res.status(400).json({
            success: false,
            message: 'Please certify the employee\'s leave credits before approving'
          });
        }
      }
      
      // Additional validation for insufficient credits
      if (approved_for === 'with_pay' || approved_for === 'others') {
        const { getLeaveCreditsInfo } = require('./LeaveRecordController');
        const numberOfDays = parseFloat(leaveRequest.number_of_days);
        const leaveCreditsInfo = await getLeaveCreditsInfo(leaveRequest.user_id.user_id, leaveRequest.leave_type);
        const hasSufficientCredits = leaveCreditsInfo.hasSufficientCredits;
        
        if (!hasSufficientCredits) {
          return res.status(400).json({
            success: false,
            message: `Cannot approve with pay or others due to insufficient leave credits`
          });
        }
      }
      
      // If "others" is selected, require a specification
      if (approved_for === 'others' && (!approved_for_other || approved_for_other.trim() === '')) {
        return res.status(400).json({
          success: false,
          message: 'Please specify the approval type when selecting "Others"'
        });
      }
    }

    // Create a leave approval record
    const approvalRecord = new LeaveApproval({
      hr_manager_id: req.user.user_id,
      leave_id: id,
      approval: approval,
      approved_for: approval === 'approve' ? approved_for : null,
      approved_for_other: approval === 'approve' && approved_for === 'others' ? approved_for_other : null,
      disapproved_due_to: approval === 'disapprove' ? disapproved_due_to : null
    });

    await approvalRecord.save();

    // Update the leave request status
    leaveRequest.status = approval === 'approve' ? 'hr_approved' : 'disapproved';
    
    // Set the comments based on the approval type
    if (approval === 'approve') {
      if (approved_for === 'others') {
        leaveRequest.hr_comments = approved_for_other;
      } else {
        leaveRequest.hr_comments = approved_for;
      }
    } else {
      leaveRequest.hr_comments = disapproved_due_to;
    }
    
    leaveRequest.hr_approved_by = req.user.user_id;
    leaveRequest.hr_approved_at = new Date();

    // Embed the HR officer's digital signature onto the form at the moment of approval
    if (approval === 'approve' && !leaveRequest.hr_signature && req.user?.signature) {
      leaveRequest.hr_signature = req.user.signature;
    }

    // Record the 7.A Certification of Leave Credits when the HR manager certifies
    if (approval === 'approve' && credits_certified) {
      leaveRequest.credits_certified = true;
      leaveRequest.credits_certified_by = req.user.user_id;
      leaveRequest.credits_certified_at = new Date();

      // Snapshot the balances as certified
      try {
        const allLeaveRecords = await LeaveRecord
          .find({ user_id: leaveRequest.user_id.user_id })
          .exec();
        const vacationEarned = allLeaveRecords.reduce((s, r) => s + (r.vacation_earned || 0), 0);
        const vacationUsed   = allLeaveRecords.reduce((s, r) => s + (r.vacation_used   || 0), 0);
        const sickEarned     = allLeaveRecords.reduce((s, r) => s + (r.sick_earned     || 0), 0);
        const sickUsed       = allLeaveRecords.reduce((s, r) => s + (r.sick_used       || 0), 0);
        leaveRequest.certified_balances = {
          vacation: { earned: vacationEarned, used: vacationUsed, balance: vacationEarned - vacationUsed },
          sick:     { earned: sickEarned,     used: sickUsed,     balance: sickEarned     - sickUsed }
        };
      } catch (balanceError) {
        console.error('Error snapshotting certified balances:', balanceError);
      }
    }

    await leaveRequest.save();
    
    // Send notifications
    try {
      // Populate user data for the notification
      const populatedLeaveRequest = await LeaveRequest.findById(id)
        .populate('user_id', 'first_name last_name');
      
      if (approval === 'approve') {
        // Send notification to Mayor
        const mayorUsers = await User.find({ user_type: 'mayor' });
        for (const mayorUser of mayorUsers) {
          await sendHrApprovedLeaveRequestNotification(populatedLeaveRequest, mayorUser._id);
        }
        
        // Send notification to employee
        await sendLeaveStatusUpdateToEmployee(populatedLeaveRequest, NOTIFICATION_TYPES.LEAVE_HR_APPROVED);
      } else {
        // Send notification to employee about HR disapproval
        await sendLeaveStatusUpdateToEmployee(
          populatedLeaveRequest, 
          NOTIFICATION_TYPES.LEAVE_HR_DISAPPROVED
        );
        
        // Send notification to department admin
        const departmentAdmin = await User.findOne({ 
          user_type: 'department_admin', 
          department_id: populatedLeaveRequest.user_id.department_id 
        });
        
        if (departmentAdmin) {
          await sendLeaveStatusUpdateToDepartmentAdmin(
            populatedLeaveRequest, 
            NOTIFICATION_TYPES.LEAVE_HR_DISAPPROVED,
            departmentAdmin._id
          );
        }
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: `Leave request has been ${approval === 'approve' ? 'approved' : 'disapproved'} by HR.`
    });
  } catch (error) {
    console.error('Error processing HR leave approval:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This leave request has already been approved by HR. Please refresh the page to see the updated status.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while processing leave approval: ' + error.message
    });
  }
};

// @desc    Get leave records with filtering for HR
// @route   GET /api/hr/leave-records
// @access  Private (HR only)
const getHRLeaveRecords = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { department, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = User.find();
    
    // Apply department filter
    if (department && department !== 'all') {
      query = query.where('department_id', department);
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
    
    // Also get all departments for the filter dropdown
    const departments = await Department.find();
    
    res.json({
      success: true,
      users,
      departments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching HR leave records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave records: ' + error.message
    });
  }
};

// @desc    Get HR reports data
// @route   GET /api/hr/reports
// @access  Private (HR only)
const getHRReports = async (req, res) => {
  try {
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    const { year, department } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // ===== LEAVE TYPE SUMMARY =====
    const leaveTypeLabels = {
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
      special_leave_benefits_women: 'Special Leave (Women)',
      special_emergency: 'Special Emergency (Calamity)',
      adoption_leave: 'Adoption Leave',
      monetization: 'Monetization of Leave Credits',
      terminal_leave: 'Terminal Leave',
      others_specify: 'Others (Specify)'
    };

    // Year-filtered date range
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    // Build query for leave requests
    let leaveQuery = { start_date: { $gte: yearStart, $lte: yearEnd } };
    if (department && department !== 'all') {
      const deptUsers = await User.find({ department_id: department }).select('user_id');
      leaveQuery.user_id = { $in: deptUsers.map(u => u.user_id) };
    }

    const allLeaveRequests = await LeaveRequest.find(leaveQuery).populate('user_id', 'first_name last_name department_id');

    // Count by leave type
    const leaveTypeCounts = {};
    const totalDaysByType = {};
    allLeaveRequests.forEach(req => {
      if (req.status === 'cancelled') return;
      const type = req.leave_type;
      leaveTypeCounts[type] = (leaveTypeCounts[type] || 0) + 1;
      totalDaysByType[type] = (totalDaysByType[type] || 0) + parseFloat(req.number_of_days || 0);
    });

    const leaveTypeSummary = Object.entries(leaveTypeLabels).map(([type, label]) => ({
      type,
      label,
      count: leaveTypeCounts[type] || 0,
      totalDays: parseFloat((totalDaysByType[type] || 0).toFixed(3))
    }));

    // Overall stats — pipeline view: pending -> recommended (HR queue) -> hr_approved (Mayor queue) -> approved
    const activeRequests = allLeaveRequests.filter(r => r.status !== 'cancelled');
    const totalRequests = activeRequests.length;
    const approvedCount    = activeRequests.filter(r => r.status === 'approved').length;
    const recommendedCount = activeRequests.filter(r => r.status === 'recommended').length;
    const hrApprovedCount  = activeRequests.filter(r => r.status === 'hr_approved').length;
    const pendingCount     = activeRequests.filter(r => r.status === 'pending').length;
    const disapprovedCount = activeRequests.filter(r => r.status === 'disapproved').length;
    const withoutPayCount  = activeRequests.filter(r => r.without_pay).length;
    const totalDays = activeRequests.reduce((sum, r) => sum + parseFloat(r.number_of_days || 0), 0);
    const decidedCount = approvedCount + disapprovedCount;

    const overallStats = {
      totalRequests,
      approvedCount,
      recommendedCount,
      hrApprovedCount,
      pendingCount,
      disapprovedCount,
      withoutPayCount,
      totalDays: parseFloat(totalDays.toFixed(3)),
      // Share of decided requests that were finally approved
      approvalRate: decidedCount > 0 ? parseFloat(((approvedCount / decidedCount) * 100).toFixed(1)) : 0
    };

    // ===== EMPLOYEE LEAVE LEDGER (year-filtered) =====
    const allUsers = await User.find().populate('department_id');
    const userLeaveRequests = {};
    activeRequests.forEach(req => {
      const reqUserId = typeof req.user_id === 'object' ? req.user_id.user_id : req.user_id;
      if (!userLeaveRequests[reqUserId]) {
        userLeaveRequests[reqUserId] = [];
      }
      userLeaveRequests[reqUserId].push(req);
    });

    // Cumulative vacation/sick balances per employee (matches the credits shown on dashboards)
    const allLeaveRecords = await LeaveRecord.find({}).exec();
    const balanceByUser = {};
    allLeaveRecords.forEach(rec => {
      const b = balanceByUser[rec.user_id] || { vE: 0, vU: 0, sE: 0, sU: 0 };
      b.vE += rec.vacation_earned || 0;
      b.vU += rec.vacation_used || 0;
      b.sE += rec.sick_earned || 0;
      b.sU += rec.sick_used || 0;
      balanceByUser[rec.user_id] = b;
    });

    const employeeLedger = allUsers.map(user => {
      const userReqs = userLeaveRequests[user.user_id] || [];
      const leavesFiled = userReqs.length;
      const totalDaysFiled = parseFloat(userReqs.reduce((sum, r) => sum + parseFloat(r.number_of_days || 0), 0).toFixed(3));
      const approvedLeaves   = userReqs.filter(r => r.status === 'approved').length;
      const inProgressLeaves = userReqs.filter(r => ['pending', 'recommended', 'hr_approved'].includes(r.status)).length;
      const disapprovedLeaves = userReqs.filter(r => r.status === 'disapproved').length;
      const bal = balanceByUser[user.user_id] || { vE: 0, vU: 0, sE: 0, sU: 0 };

      return {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department_id?.name || 'No Department',
        position: user.position || 'N/A',
        leavesFiled,
        approvedLeaves,
        inProgressLeaves,
        disapprovedLeaves,
        totalDaysFiled,
        vacationBalance: parseFloat((bal.vE - bal.vU).toFixed(3)),
        sickBalance: parseFloat((bal.sE - bal.sU).toFixed(3))
      };
    }).filter(emp => emp.leavesFiled > 0); // Only show employees who filed leave this year

    // ===== MONTHLY TRENDS =====
    const monthlyTrends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(targetYear, month, 1);
      const monthEnd = new Date(targetYear, month + 1, 0, 23, 59, 59, 999);

      const monthRequests = allLeaveRequests.filter(req => {
        const reqDate = new Date(req.start_date);
        return reqDate >= monthStart && reqDate <= monthEnd;
      });

      const filed = monthRequests.filter(r => r.status !== 'cancelled').length;
      const approved = monthRequests.filter(r => ['approved', 'hr_approved'].includes(r.status)).length;
      const pending = monthRequests.filter(r => r.status === 'pending').length;
      const daysUsed = parseFloat(monthRequests.filter(r => r.status !== 'cancelled').reduce((sum, r) => sum + parseFloat(r.number_of_days || 0), 0).toFixed(3));

      // Count by type for this month
      const typeBreakdown = {};
      monthRequests.filter(r => r.status !== 'cancelled').forEach(req => {
        typeBreakdown[req.leave_type] = (typeBreakdown[req.leave_type] || 0) + 1;
      });

      monthlyTrends.push({
        month: months[month],
        monthNum: month + 1,
        year: targetYear,
        filed,
        approved,
        pending,
        daysUsed,
        typeBreakdown
      });
    }

    // ===== DEPARTMENT BREAKDOWN (year-filtered) =====
    const departments = await Department.find();
    const departmentBreakdown = departments.map(dept => {
      const deptUsers = allUsers.filter(u => u.department_id && u.department_id._id.toString() === dept._id.toString());
      const deptUserIds = deptUsers.map(u => u.user_id);
      const deptRequests = activeRequests.filter(r => {
        const reqUserId = typeof r.user_id === 'object' ? r.user_id.user_id : r.user_id;
        return deptUserIds.includes(reqUserId);
      });

      return {
        department: dept.name,
        totalEmployees: deptUsers.length,
        leavesFiled: deptRequests.length,
        totalDays: parseFloat(deptRequests.reduce((sum, r) => sum + parseFloat(r.number_of_days || 0), 0).toFixed(3)),
        approved: deptRequests.filter(r => r.status === 'approved').length,
        inProgress: deptRequests.filter(r => ['pending', 'recommended', 'hr_approved'].includes(r.status)).length,
        disapproved: deptRequests.filter(r => r.status === 'disapproved').length
      };
    }).filter(d => d.leavesFiled > 0); // Only show departments with activity

    res.json({
      success: true,
      overallStats,
      leaveTypeSummary,
      employeeLedger,
      monthlyTrends,
      departmentBreakdown
    });
  } catch (error) {
    console.error('Error fetching HR reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports: ' + error.message
    });
  }
};

module.exports = {
  getHRDashboardStats,
  getHRDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getHRLeaveRequests,
  getHRLeaveRequest,
  processHRLeaveApproval,
  getHRLeaveRecords,
  getHRReports
};