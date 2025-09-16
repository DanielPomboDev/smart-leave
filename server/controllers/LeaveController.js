const LeaveRequest = require('../models/LeaveRequest');
const { sendNewLeaveRequestNotification } = require('../utils/notificationUtils');
const User = require('../models/User');
const { hasSufficientLeaveCredits } = require('./LeaveRecordController');

// @desc    Create a new leave request
// @route   POST /api/leave-requests
// @access  Private
const createLeaveRequest = async (req, res) => {
  try {
    const {
      leave_type,
      subtype,
      start_date,
      end_date,
      number_of_days,
      where_spent,
      commutation,
      location_specify
    } = req.body;

    // Validate required fields
    if (!leave_type || !subtype || !start_date || !end_date || !number_of_days || !where_spent) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if employee has sufficient leave credits
    const numberOfDaysFloat = parseFloat(number_of_days);
    const hasSufficientCredits = await hasSufficientLeaveCredits(req.user.user_id, leave_type, numberOfDaysFloat);
    
    let isWithoutPay = false;
    let availableCredits = 0; // Declare availableCredits outside the if block
    if (!hasSufficientCredits) {
      // Get the latest leave record for this user to determine their current balance
      const LeaveRecord = require('../models/LeaveRecord');
      const latestLeaveRecord = await LeaveRecord
        .findOne({ user_id: req.user.user_id })
        .sort({ year: -1, month: -1 })
        .exec();
      
      // If no record exists, use default values
      if (!latestLeaveRecord) {
        availableCredits = leave_type === 'vacation' ? 15 : 12; // Default balances
      } else {
        // Get all leave records for this user to calculate cumulative balance
        const allLeaveRecords = await LeaveRecord
          .find({ user_id: req.user.user_id })
          .sort({ year: -1, month: -1 })
          .exec();
        
        if (allLeaveRecords.length === 0) {
          availableCredits = leave_type === 'vacation' ? 15 : 12; // Default balances
        } else {
          // Calculate cumulative balance
          const cumulativeBalance = allLeaveRecords.reduce((sum, record) => sum + record[leave_type === 'vacation' ? 'vacation_earned' : 'sick_earned'], 0) - 
                                   allLeaveRecords.reduce((sum, record) => sum + record[leave_type === 'vacation' ? 'vacation_used' : 'sick_used'], 0);
          availableCredits = cumulativeBalance;
        }
      }
      
      // Set the without_pay flag to true
      isWithoutPay = true;
    }

    // Format where_spent based on location type
    let formattedWhereSpent = where_spent;
    if (where_spent === 'abroad' && location_specify) {
      formattedWhereSpent = location_specify;
    } else if (where_spent === 'outpatient' && location_specify) {
      formattedWhereSpent = `Outpatient: ${location_specify}`;
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      user_id: req.user.user_id, // Use user_id from authenticated user
      leave_type,
      subtype,
      start_date,
      end_date,
      number_of_days: parseInt(number_of_days),
      where_spent: formattedWhereSpent,
      commutation: commutation === '1' || commutation === true,
      without_pay: isWithoutPay,
      status: 'pending'
    });

    const savedLeaveRequest = await leaveRequest.save();

    // Send notification to department admin
    try {
      // Get the user's department
      const user = await User.findOne({ user_id: req.user.user_id });
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
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    // Prepare response with warning if applicable
    const response = {
      success: true,
      message: 'Leave request submitted successfully',
      data: savedLeaveRequest
    };
    
    // Add warning message if applicable
    if (isWithoutPay) {
      response.warning = `Insufficient ${leave_type} leave credits. You have ${availableCredits.toFixed(3)} days available but are requesting ${numberOfDaysFloat} days. This leave will be considered without pay.`;
    }

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
    const cancellableStatuses = ['pending', 'recommended', 'hr_approved'];
    if (!cancellableStatuses.includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'This leave request cannot be cancelled at this stage'
      });
    }

    // Update status to cancelled
    leaveRequest.status = 'cancelled';
    const updatedLeaveRequest = await leaveRequest.save();

    res.json({
      success: true,
      message: 'Leave request has been successfully cancelled',
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

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequest,
  cancelLeaveRequest
};