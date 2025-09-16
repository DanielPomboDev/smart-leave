const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveRecommendation = require('../models/LeaveRecommendation');
const { sendRecommendedLeaveRequestNotification, sendLeaveStatusUpdateToEmployee } = require('../utils/notificationUtils');
const { NOTIFICATION_TYPES } = require('../utils/notificationUtils');

// @desc    Get department dashboard statistics
// @route   GET /api/department/dashboard
// @access  Private (Department Admin only)
const getDashboardStats = async (req, res) => {
  try {
    // req.user is set by the auth middleware and already populated with department info
    if (!req.user || req.user.user_type !== 'department_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin access required.'
      });
    }
    
    const departmentId = req.user.department_id;
    
    // Get all employees in the department
    const departmentEmployees = await User.find({
      department_id: departmentId,
      user_type: 'employee'
    }).select('user_id');
    
    const employeeIds = departmentEmployees.map(emp => emp.user_id);
    
    // Get statistics
    const pendingCount = await LeaveRequest.countDocuments({
      user_id: { $in: employeeIds },
      status: 'pending'
    });
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    
    const approvedThisMonthCount = await LeaveRequest.countDocuments({
      user_id: { $in: employeeIds },
      status: 'approved',
      updatedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    
    const rejectedThisMonthCount = await LeaveRequest.countDocuments({
      user_id: { $in: employeeIds },
      status: 'disapproved',
      updatedAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });
    
    const departmentEmployeesCount = employeeIds.length;
    
    // Get recent leave requests (last 5)
    const recentLeaveRequests = await LeaveRequest.find({
      user_id: { $in: employeeIds }
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    res.json({
      success: true,
      stats: {
        pending: pendingCount,
        approved_this_month: approvedThisMonthCount,
        rejected_this_month: rejectedThisMonthCount,
        department_employees: departmentEmployeesCount
      },
      leaveRequests: recentLeaveRequests
    });
  } catch (error) {
    console.error('Error fetching department dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Get all leave requests for the department
// @route   GET /api/department/leave-requests
// @access  Private (Department Admin only)
const getDepartmentLeaveRequests = async (req, res) => {
  try {
    // req.user is set by the auth middleware and already populated with department info
    if (!req.user || req.user.user_type !== 'department_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin access required.'
      });
    }
    
    const departmentId = req.user.department_id;
    
    // Get all employees in the department
    const departmentEmployees = await User.find({
      department_id: departmentId,
      user_type: 'employee'
    }).select('user_id');
    
    const employeeIds = departmentEmployees.map(emp => emp.user_id);
    
    // Get all leave requests for the department
    const leaveRequests = await LeaveRequest.find({
      user_id: { $in: employeeIds }
    })
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Error fetching department leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave requests'
    });
  }
};

// @desc    Get a specific leave request for the department
// @route   GET /api/department/leave-requests/:id
// @access  Private (Department Admin only)
const getDepartmentLeaveRequest = async (req, res) => {
  try {
    console.log('Fetching leave request with ID:', req.params.id);
    
    // req.user is set by the auth middleware and already populated with department info
    if (!req.user || req.user.user_type !== 'department_admin') {
      console.log('User validation failed:', { user: req.user, userType: req.user?.user_type });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin access required.'
      });
    }
    
    const departmentId = req.user.department_id;
    console.log('Department ID:', departmentId);
    
    const leaveRequestId = req.params.id;
    console.log('Leave request ID:', leaveRequestId);
    
    // Get the leave request with populated user data
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    console.log('Found leave request:', JSON.stringify(leaveRequest, null, 2));
    
    if (!leaveRequest) {
      console.log('Leave request not found');
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if the leave request belongs to an employee in the same department
    console.log('Checking if leave request belongs to department.');
    console.log('Leave request user_id type:', typeof leaveRequest.user_id);
    console.log('Leave request user_id value:', leaveRequest.user_id);
    console.log('Department admin department_id:', departmentId);
    
    // Handle case where user_id is already populated (object) or is a string
    let user = null;
    let userId = null;
    
    if (typeof leaveRequest.user_id === 'object' && leaveRequest.user_id !== null) {
      // user_id is already populated with user object
      user = leaveRequest.user_id;
      userId = user.user_id;
      console.log('User is already populated:', JSON.stringify(user, null, 2));
    } else if (typeof leaveRequest.user_id === 'string') {
      // user_id is a string, need to find the user
      userId = leaveRequest.user_id;
      console.log('Searching for user with user_id:', `"${userId}"`);
      user = await User.findOne({ user_id: userId });
      
      // If not found, try trimming whitespace
      if (!user) {
        console.log('User not found, trying trimmed user_id');
        user = await User.findOne({ user_id: userId.trim() });
      }
    } else {
      console.log('Invalid user_id format:', typeof leaveRequest.user_id);
      return res.status(500).json({
        success: false,
        message: 'Invalid user ID format in leave request.'
      });
    }
    
    // If still no user found
    if (!user) {
      console.log('User not found for leave request with user_id:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found for this leave request.'
      });
    }
    
    console.log('Found user:', JSON.stringify(user, null, 2));
    console.log('User department_id:', user.department_id);
    console.log('Comparing department IDs:', user.department_id.toString(), departmentId.toString());
    
    // Check if user's department matches department admin's department
    // Both are ObjectIds, so we need to compare their string representations
    if (user.department_id.toString() !== departmentId.toString()) {
      console.log('Department mismatch');
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this leave request.'
      });
    }
    
    // If user_id was a string, we need to get the populated version
    let populatedLeaveRequest = leaveRequest;
    if (typeof leaveRequest.user_id === 'string') {
      // Since the LeaveRequest model has a pre-find hook that populates user data,
      // we just need to fetch the request again to get the populated version
      populatedLeaveRequest = await LeaveRequest.findById(leaveRequestId);
      console.log('Populated leave request:', JSON.stringify(populatedLeaveRequest, null, 2));
    }
    
    res.json({
      success: true,
      data: populatedLeaveRequest
    });
  } catch (error) {
    console.error('Error fetching department leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leave request: ' + error.message
    });
  }
};

// @desc    Recommend/approve a leave request
// @route   POST /api/department/leave-requests/:id/recommend
// @access  Private (Department Admin only)
const recommendLeaveRequest = async (req, res) => {
  try {
    // req.user is set by the auth middleware and already populated with department info
    if (!req.user || req.user.user_type !== 'department_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Department admin access required.'
      });
    }
    
    const departmentId = req.user.department_id;
    const leaveRequestId = req.params.id;
    const { recommendation, approval_reason, disapproval_reason } = req.body;
    
    // Validate input
    if (!recommendation || !['approve', 'disapprove'].includes(recommendation)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recommendation (approve or disapprove)'
      });
    }
    
    if (recommendation === 'disapprove' && !disapproval_reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for disapproval'
      });
    }
    
    // Get the leave request
    const leaveRequest = await LeaveRequest.findById(leaveRequestId);
    
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Handle case where user_id is already populated (object) or is a string
    let user = null;
    let userId = null;
    
    if (typeof leaveRequest.user_id === 'object' && leaveRequest.user_id !== null) {
      // user_id is already populated with user object
      user = leaveRequest.user_id;
      userId = user.user_id;
    } else if (typeof leaveRequest.user_id === 'string') {
      // user_id is a string, need to find the user
      userId = leaveRequest.user_id;
      user = await User.findOne({ user_id: userId });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Invalid user ID format in leave request.'
      });
    }
    
    // If still no user found
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found for this leave request.'
      });
    }
    
    // Check if user's department matches department admin's department
    if (user.department_id.toString() !== departmentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to process this leave request.'
      });
    }
    
    // Check if the leave request is still pending
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This leave request has already been processed.'
      });
    }
    
    // Check if a recommendation already exists for this leave request and department admin
    const existingRecommendation = await LeaveRecommendation.findOne({
      leave_id: leaveRequestId,
      department_admin_id: req.user.user_id
    });
    
    if (existingRecommendation) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a recommendation for this leave request.'
      });
    }
    
    // Create a leave recommendation record
    const recommendationRecord = new LeaveRecommendation({
      department_admin_id: req.user.user_id,
      leave_id: leaveRequestId,
      recommendation: recommendation,
      remarks: recommendation === 'approve' ? approval_reason : disapproval_reason
    });

    await recommendationRecord.save();

    // Update the leave request status
    const newStatus = recommendation === 'approve' ? 'recommended' : 'disapproved';
    leaveRequest.status = newStatus;
    leaveRequest.department_comments = recommendation === 'approve' ? approval_reason : disapproval_reason;
    leaveRequest.department_approved_by = req.user.user_id;
    leaveRequest.department_approved_at = new Date();
    
    await leaveRequest.save();
    
    // Send notifications
    try {
      // Populate user data for the notification
      const populatedLeaveRequest = await LeaveRequest.findById(leaveRequestId)
        .populate('user_id', 'first_name last_name');
      
      if (recommendation === 'approve') {
        // Send notification to HR
        const hrUsers = await User.find({ user_type: 'hr' });
        for (const hrUser of hrUsers) {
          await sendRecommendedLeaveRequestNotification(populatedLeaveRequest, hrUser._id);
        }
        
        // Send notification to employee
        await sendLeaveStatusUpdateToEmployee(populatedLeaveRequest, NOTIFICATION_TYPES.LEAVE_RECOMMENDED);
      } else {
        // Send notification to employee about disapproval
        await sendLeaveStatusUpdateToEmployee(
          populatedLeaveRequest, 
          NOTIFICATION_TYPES.LEAVE_DEPARTMENT_DISAPPROVED
        );
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: `Leave request has been ${recommendation}d by department.`
    });
  } catch (error) {
    console.error('Error processing department leave recommendation:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'This leave request has already been recommended by your department. Please refresh the page to see the updated status.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while processing leave recommendation: ' + error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getDepartmentLeaveRequests,
  getDepartmentLeaveRequest,
  recommendLeaveRequest
};