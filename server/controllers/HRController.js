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
    // req.user is set by the auth middleware
    if (!req.user || req.user.user_type !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR access required.'
      });
    }

    // Get all departments
    const departments = await Department.find();

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
      select: 'first_name last_name middle_initial department_id position user_id profile_image',
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
    } else {
      // Default balances if no record exists
      leaveRequestWithRecommendations.user_id.vacation_balance = 0;
      leaveRequestWithRecommendations.user_id.sick_balance = 0;
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
    const { approval, approved_for, approved_for_other, disapproved_due_to } = req.body;

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

module.exports = {
  getHRDashboardStats,
  getHRDepartments,
  getHRLeaveRequests,
  getHRLeaveRequest,
  processHRLeaveApproval,
  getHRLeaveRecords
};