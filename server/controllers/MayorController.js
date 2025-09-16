const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const LeaveRecommendation = require('../models/LeaveRecommendation');
const LeaveApproval = require('../models/LeaveApproval');
const LeaveRecord = require('../models/LeaveRecord');
const { sendLeaveStatusUpdateToEmployee } = require('../utils/notificationUtils');
const { NOTIFICATION_TYPES } = require('../utils/notificationUtils');
const { hasSufficientLeaveCredits } = require('./LeaveRecordController');

class MayorController {
  /**
   * Record an approved leave request in the appropriate month's leave record
   * 
   * @param {Object} leaveRequest - The leave request object
   * @param {boolean} hasSufficientCredits - Whether the employee had sufficient credits
   * @return {Promise<void>}
   */
  static async recordLeave(leaveRequest, hasSufficientCredits) {
    try {
      // Get the month and year when the leave will be taken (not current date)
      const leaveDate = new Date(leaveRequest.start_date);
      const leaveMonth = leaveDate.getMonth() + 1; // getMonth() is zero-based
      const leaveYear = leaveDate.getFullYear();

      // Get the most recent leave record for this user to determine their current balances
      const latestLeaveRecord = await LeaveRecord.findOne({ user_id: leaveRequest.user_id })
        .sort({ year: -1, month: -1 })
        .exec();

      // Calculate previous balances
      const previousVacationBalance = latestLeaveRecord ? latestLeaveRecord.vacation_balance : 0;
      const previousSickBalance = latestLeaveRecord ? latestLeaveRecord.sick_balance : 0;

      // Check if a leave record already exists for the leave month
      let leaveRecord = await LeaveRecord.findOne({
        user_id: leaveRequest.user_id,
        month: leaveMonth,
        year: leaveYear
      });

      if (!leaveRecord) {
        // Create a new leave record with initial values
        // NOTE: Monthly credits are calculated at month end, not when individual leaves are approved
        leaveRecord = new LeaveRecord({
          user_id: leaveRequest.user_id,
          month: leaveMonth,
          year: leaveYear,
          vacation_earned: 0, // Will be calculated at month end
          sick_earned: 0, // Will be calculated at month end
          vacation_used: 0,
          sick_used: 0,
          vacation_balance: previousVacationBalance,
          sick_balance: previousSickBalance,
          undertime_hours: 0,
          lwop_days: 0,       // Days on leave without pay
          vacation_entries: [],
          sick_entries: []
        });
        await leaveRecord.save();
      }

      // Initialize vacation_entries and sick_entries as arrays if they are null
      const vacationEntries = leaveRecord.vacation_entries || [];
      const sickEntries = leaveRecord.sick_entries || [];

      // Format the leave entry
      const leaveEntry = {
        start_date: new Date(leaveRequest.start_date).toISOString().split('T')[0],
        end_date: new Date(leaveRequest.end_date).toISOString().split('T')[0],
        days: leaveRequest.number_of_days,
        type: leaveRequest.leave_type,
        subtype: leaveRequest.subtype,
        paid: !leaveRequest.without_pay // Add information about whether it was paid or not (opposite of without_pay)
      };

      // Store the current used values to calculate the actual deduction
      const previousVacationUsed = leaveRecord.vacation_used;
      const previousSickUsed = leaveRecord.sick_used;

      // Record the leave (deduct credits only if it's a leave with pay AND it's for the current or past month)
      const currentDate = new Date();
      const isCurrentOrPastMonth = (leaveYear < currentDate.getFullYear()) || 
                                 (leaveYear == currentDate.getFullYear() && leaveMonth <= (currentDate.getMonth() + 1));
      
      // Only deduct leave credits if this is a leave with pay (not without_pay)
      const isLeaveWithPay = !leaveRequest.without_pay;
      
      if (leaveRequest.leave_type === 'vacation') {
        // For future months, just record the entry without deducting leave
        // For current/past months, deduct only for leave with pay
        if (isLeaveWithPay && isCurrentOrPastMonth) {
          leaveRecord.vacation_used += leaveRequest.number_of_days;
          leaveRecord.vacation_balance -= leaveRequest.number_of_days;
          
          // Track LWOP days if this was originally without pay but we're recording it anyway
          if (leaveRequest.without_pay) {
            leaveRecord.lwop_days = (leaveRecord.lwop_days || 0) + leaveRequest.number_of_days;
          }
        }
        vacationEntries.push(leaveEntry);
      } else if (leaveRequest.leave_type === 'sick') {
        // For future months, just record the entry without deducting leave
        // For current/past months, deduct only for leave with pay
        if (isLeaveWithPay && isCurrentOrPastMonth) {
          leaveRecord.sick_used += leaveRequest.number_of_days;
          leaveRecord.sick_balance -= leaveRequest.number_of_days;
          
          // Track LWOP days if this was originally without pay but we're recording it anyway
          if (leaveRequest.without_pay) {
            leaveRecord.lwop_days = (leaveRecord.lwop_days || 0) + leaveRequest.number_of_days;
          }
        }
        sickEntries.push(leaveEntry);
      }

      // Update the entries arrays
      leaveRecord.vacation_entries = vacationEntries;
      leaveRecord.sick_entries = sickEntries;

      // Save the updated leave record
      await leaveRecord.save();
    } catch (error) {
      console.error('Error recording leave:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(req, res) {
    try {
      console.log('Fetching dashboard stats for user:', req.user);
      const stats = {
        pending: await LeaveRequest.countDocuments({ status: 'pending' }),
        approved_this_month: await LeaveRequest.countDocuments({
          status: 'approved',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        rejected_this_month: await LeaveRequest.countDocuments({
          status: 'disapproved',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
          }
        }),
        total_employees: await User.countDocuments()
      };

      console.log('Dashboard stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get recent leave requests for dashboard
  static async getRecentLeaveRequests(req, res) {
    try {
      console.log('Fetching recent leave requests for user:', req.user);
      const leaveRequests = await LeaveRequest.find({
        status: { $in: ['hr_approved', 'approved', 'cancelled'] }
      })
        .populate({
          path: 'user_id',
          select: 'first_name last_name middle_initial department_id position user_id',
          populate: {
            path: 'department_id',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 })
        .limit(5);

      // Map leave requests to include id field
      const mappedLeaveRequests = leaveRequests.map(request => {
        const requestObj = request.toObject();
        return {
          ...requestObj,
          id: requestObj._id.toString()
        };
      });

      console.log('Recent leave requests count:', mappedLeaveRequests.length);
      res.json(mappedLeaveRequests);
    } catch (error) {
      console.error('Error fetching recent leave requests:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get leave requests with filtering and pagination
  static async getLeaveRequests(req, res) {
    try {
      console.log('Fetching leave requests');
      console.log('User:', req.user);

      // Build filter query
      const filter = {
        status: { $in: ['hr_approved', 'approved', 'disapproved', 'cancelled'] }
      };

      console.log('Final filter:', JSON.stringify(filter, null, 2));

      // Get leave requests
      const leaveRequests = await LeaveRequest.find(filter)
        .populate({
          path: 'user_id',
          select: 'first_name last_name middle_initial department_id position user_id',
          populate: {
            path: 'department_id',
            select: 'name'
          }
        })
        .sort({ createdAt: -1 });

      // Map leave requests to include id field
      const mappedLeaveRequests = leaveRequests.map(request => {
        const requestObj = request.toObject();
        return {
          ...requestObj,
          id: requestObj._id.toString()
        };
      });

      console.log('Found leave requests:', mappedLeaveRequests.length);

      res.json({
        leaveRequests: mappedLeaveRequests
      });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Get details of a specific leave request
  static async getLeaveRequestDetails(req, res) {
    try {
      console.log('Fetching leave request details for ID:', req.params.id);
      console.log('User:', req.user);
      
      // Check if ID is provided and valid
      if (!req.params.id || req.params.id === 'undefined') {
        console.log('Invalid or missing ID:', req.params.id);
        return res.status(400).json({ message: 'Invalid leave request ID' });
      }
      
      const leaveRequest = await LeaveRequest.findById(req.params.id)
        .populate({
          path: 'user_id',
          select: 'first_name last_name middle_initial department_id position user_id profile_image',
          populate: {
            path: 'department_id',
            select: 'name'
          }
        });

      if (!leaveRequest) {
        console.log('Leave request not found for ID:', req.params.id);
        return res.status(404).json({ message: 'Leave request not found' });
      }

      // Check if the leave request is eligible for mayor action
      if (!['hr_approved', 'approved', 'disapproved', 'cancelled'].includes(leaveRequest.status)) {
        console.log('Leave request not eligible for mayor action, status:', leaveRequest.status);
        return res.status(403).json({ message: 'This request is not eligible for mayor approval.' });
      }

      // Get recommendations for this leave request
      const recommendations = await LeaveRecommendation.find({ leave_id: leaveRequest._id })
        .populate({
          path: 'department_admin_id',
          select: 'first_name last_name user_id',
          foreignField: 'user_id',  // Match User's user_id field instead of _id
          localField: 'department_admin_id'  // Use LeaveRecommendation's department_admin_id field
        });

      // Get approvals for this leave request
      const approvals = await LeaveApproval.find({ leave_id: leaveRequest._id })
        .populate({
          path: 'hr_manager_id',
          select: 'first_name last_name user_id',
          foreignField: 'user_id',  // Match User's user_id field instead of _id
          localField: 'hr_manager_id'  // Use LeaveApproval's hr_manager_id field
        });

      // Attach recommendations and approvals to the leave request object
      const leaveRequestWithDetails = leaveRequest.toObject();
      leaveRequestWithDetails.recommendations = recommendations;
      leaveRequestWithDetails.approvals = approvals;
      // Ensure id field is included
      leaveRequestWithDetails.id = leaveRequestWithDetails._id.toString();

      res.json(leaveRequestWithDetails);
    } catch (error) {
      console.error('Error fetching leave request details:', error);
      // Handle CastError specifically
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid leave request ID format' });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // Process mayor's decision on a leave request
  static async processLeaveRequest(req, res) {
    try {
      console.log('Processing leave request:', req.params.id);
      console.log('User:', req.user);
      
      // Check if ID is provided and valid
      if (!req.params.id || req.params.id === 'undefined') {
        console.log('Invalid or missing ID:', req.params.id);
        return res.status(400).json({ message: 'Invalid leave request ID' });
      }
      
      const { decision } = req.body;

      // Validate decision
      if (!['approve', 'disapprove'].includes(decision)) {
        console.log('Invalid decision value:', decision);
        return res.status(400).json({ message: 'Invalid decision value' });
      }

      // Find the leave request
      const leaveRequest = await LeaveRequest.findById(req.params.id)
        .populate({
          path: 'user_id',
          select: 'first_name last_name email user_id',
          foreignField: 'user_id',
          localField: 'user_id'
        });

      if (!leaveRequest) {
        console.log('Leave request not found for ID:', req.params.id);
        return res.status(404).json({ message: 'Leave request not found' });
      }

      // Check if the leave request is eligible for mayor action
      if (leaveRequest.status !== 'hr_approved') {
        console.log('Leave request not HR-approved yet, status:', leaveRequest.status);
        return res.status(400).json({ message: 'Request not HR-approved yet.' });
      }

      // Get the user_id before de-populating
      const userId = leaveRequest.user_id.user_id;

      // Store properties we need for recordLeave before de-populating
      const leaveType = leaveRequest.leave_type;
      const numberOfDays = leaveRequest.number_of_days;
      const withoutPay = leaveRequest.without_pay;
      const startDate = leaveRequest.start_date;
      const endDate = leaveRequest.end_date;
      const subtype = leaveRequest.subtype;

      // Update status based on mayor's decision
      leaveRequest.status = decision === 'approve' ? 'approved' : 'disapproved';

      // De-populate user_id before saving to avoid validation errors
      leaveRequest.user_id = userId;
      
      await leaveRequest.save();

      if (decision === 'approve') {
        // Check if employee had sufficient credits when submitting the request
        const hasSufficientCredits = await hasSufficientLeaveCredits(
          userId,
          leaveType,
          numberOfDays
        );
        
        // Create a simplified leave request object with the properties we need
        const simplifiedLeaveRequest = {
          user_id: userId,
          leave_type: leaveType,
          number_of_days: numberOfDays,
          without_pay: withoutPay,
          start_date: startDate,
          end_date: endDate,
          subtype: subtype
        };
        
        // Record the leave (always do this for approved leaves)
        await MayorController.recordLeave(simplifiedLeaveRequest, hasSufficientCredits);
      }
      
      // Send notifications
      try {
        // Populate user data for the notification
        const populatedLeaveRequest = await LeaveRequest.findById(req.params.id)
          .populate({
            path: 'user_id',
            select: 'first_name last_name email user_id department_id',
            foreignField: 'user_id',
            localField: 'user_id'
          });
        
        if (decision === 'approve') {
          // Send notification to employee
          await sendLeaveStatusUpdateToEmployee(populatedLeaveRequest, NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED);
          
          // Send notification to department admin and HR
          const departmentAdmin = await User.findOne({ 
            user_type: 'department_admin', 
            department_id: populatedLeaveRequest.user_id.department_id 
          });
          
          if (departmentAdmin) {
            await sendLeaveStatusUpdateToEmployee(
              populatedLeaveRequest, 
              NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED,
              '',
              departmentAdmin._id,
              'department_admin'
            );
          }
          
          const hrUsers = await User.find({ user_type: 'hr' });
          for (const hrUser of hrUsers) {
            await sendLeaveStatusUpdateToEmployee(
              populatedLeaveRequest, 
              NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED,
              '',
              hrUser._id,
              'hr'
            );
          }
        } else {
          // Send notification to employee about Mayor disapproval
          await sendLeaveStatusUpdateToEmployee(
            populatedLeaveRequest, 
            NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED,
            ''
          );
          
          // Send notification to department admin and HR
          const departmentAdmin = await User.findOne({ 
            user_type: 'department_admin', 
            department_id: populatedLeaveRequest.user_id.department_id 
          });
          
          if (departmentAdmin) {
            await sendLeaveStatusUpdateToEmployee(
              populatedLeaveRequest, 
              NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED,
              '',
              departmentAdmin._id,
              'department_admin'
            );
          }
          
          const hrUsers = await User.find({ user_type: 'hr' });
          for (const hrUser of hrUsers) {
            await sendLeaveStatusUpdateToEmployee(
              populatedLeaveRequest, 
              NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED,
              '',
              hrUser._id,
              'hr'
            );
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }

      // Return the updated leave request with id field
      const updatedLeaveRequest = leaveRequest.toObject();
      updatedLeaveRequest.id = updatedLeaveRequest._id.toString();
      
      res.json({ message: 'Final decision recorded successfully', leaveRequest: updatedLeaveRequest });
    } catch (error) {
      console.error('Error processing leave request:', error);
      // Handle CastError specifically
      if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid leave request ID format' });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = MayorController;