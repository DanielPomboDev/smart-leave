const { createNotification } = require('../controllers/NotificationController');
const { sendNewLeaveRequestEmail, sendLeaveStatusUpdateEmail } = require('./emailService');
const User = require('../models/User');

// Notification types
const NOTIFICATION_TYPES = {
  NEW_LEAVE_REQUEST: 'new_request',
  LEAVE_RECOMMENDED: 'recommended',
  LEAVE_HR_APPROVED: 'hr_approved',
  LEAVE_HR_DISAPPROVED: 'hr_disapproved',
  LEAVE_MAYOR_APPROVED: 'mayor_approved',
  LEAVE_MAYOR_DISAPPROVED: 'mayor_disapproved',
  LEAVE_DEPARTMENT_DISAPPROVED: 'department_disapproved'
};

// Send notification for new leave request to department admin
const sendNewLeaveRequestNotification = async (leaveRequest, departmentAdminId) => {
  console.log('Sending new leave request notification to department admin:', departmentAdminId);
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  const data = {
    message: `New leave request from ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    status: 'new',
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    requester_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days
  };

  // Use departmentAdminId which should be the MongoDB _id
  const notification = await createNotification('department_admin', departmentAdminId.toString(), NOTIFICATION_TYPES.NEW_LEAVE_REQUEST, data);
  
  // Send email notification if user has email
  try {
    const user = await User.findById(departmentAdminId);
    if (user && user.email) {
      console.log('Sending email notification to department admin:', user.email);
      await sendNewLeaveRequestEmail(user, data);
    } else {
      console.log('Department admin does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
  
  return notification;
};

// Send notification for recommended leave request to HR
const sendRecommendedLeaveRequestNotification = async (leaveRequest, hrId) => {
  console.log('Sending recommended leave request notification to HR:', hrId);
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  const data = {
    message: `Leave request from ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} recommended for approval`,
    status: 'recommended',
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    requester_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days
  };

  const notification = await createNotification('hr', hrId.toString(), NOTIFICATION_TYPES.LEAVE_RECOMMENDED, data);
  
  // Send email notification if user has email
  try {
    const user = await User.findById(hrId);
    if (user && user.email) {
      console.log('Sending email notification to HR:', user.email);
      await sendNewLeaveRequestEmail(user, data);
    } else {
      console.log('HR user does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
  
  return notification;
};

// Send notification for HR approved leave request to Mayor
const sendHrApprovedLeaveRequestNotification = async (leaveRequest, mayorId) => {
  console.log('Sending HR approved leave request notification to Mayor:', mayorId);
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  const data = {
    message: `Leave request from ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} approved by HR`,
    status: 'hr_approved',
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    requester_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days
  };

  const notification = await createNotification('mayor', mayorId.toString(), NOTIFICATION_TYPES.LEAVE_HR_APPROVED, data);
  
  // Send email notification if user has email
  try {
    const user = await User.findById(mayorId);
    if (user && user.email) {
      console.log('Sending email notification to Mayor:', user.email);
      await sendNewLeaveRequestEmail(user, data);
    } else {
      console.log('Mayor user does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
  
  return notification;
};

// Send notification to employee about leave request status
const sendLeaveStatusUpdateToEmployee = async (leaveRequest, notificationType, comments = '', userId = null, userType = null) => {
  console.log('Sending leave status update notification to employee:', { notificationType, userId, userType });
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  let message = '';
  let status = '';
  let title = '';

  switch (notificationType) {
    case NOTIFICATION_TYPES.LEAVE_RECOMMENDED:
      message = 'Your leave request has been recommended by your department head';
      status = 'recommended';
      title = 'Leave Request Recommended';
      break;
    case NOTIFICATION_TYPES.LEAVE_HR_APPROVED:
      message = 'Your leave request has been approved by HR';
      status = 'hr_approved';
      title = 'Leave Request HR Approved';
      break;
    case NOTIFICATION_TYPES.LEAVE_HR_DISAPPROVED:
      message = 'Your leave request has been disapproved by HR';
      status = 'hr_disapproved';
      title = 'Leave Request HR Disapproved';
      break;
    case NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED:
      message = 'Your leave request has been final approved by the Mayor';
      status = 'mayor_approved';
      title = 'Leave Request Mayor Approved';
      break;
    case NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED:
      message = 'Your leave request has been final disapproved by the Mayor';
      status = 'mayor_disapproved';
      title = 'Leave Request Mayor Disapproved';
      break;
    case NOTIFICATION_TYPES.LEAVE_DEPARTMENT_DISAPPROVED:
      message = 'Your leave request has been disapproved by your department head';
      status = 'department_disapproved';
      title = 'Leave Request Department Disapproved';
      break;
    default:
      message = 'Leave request status updated';
      status = 'updated';
      title = 'Leave Request Status Updated';
  }

  const data = {
    message,
    status,
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days,
    comments
  };

  // If userId and userType are provided, send to that specific user
  if (userId && userType) {
    const notification = await createNotification(userType, userId.toString(), notificationType, data);
    
    // Send email notification if user has email
    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        console.log('Sending email notification to specific user:', user.email);
        await sendLeaveStatusUpdateEmail(user, data);
      } else {
        console.log('Specific user does not have email address or user not found');
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
    
    return notification;
  }

  // Otherwise, send to the employee who made the request
  // The leaveRequest.user_id._id should be the MongoDB ObjectId
  const employeeId = leaveRequest.user_id._id ? leaveRequest.user_id._id.toString() : leaveRequest.user_id.user_id;
  const notification = await createNotification('employee', employeeId, notificationType, data);
  
  // Send email notification to employee
  try {
    // Get the employee user object
    const employeeUser = await User.findOne({ user_id: employeeId });
    if (employeeUser && employeeUser.email) {
      console.log('Sending email notification to employee:', employeeUser.email);
      await sendLeaveStatusUpdateEmail(employeeUser, data);
    } else {
      console.log('Employee does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification to employee:', error);
  }
  
  return notification;
};

// Send notification to department admin about leave request status
const sendLeaveStatusUpdateToDepartmentAdmin = async (leaveRequest, notificationType, departmentAdminId) => {
  console.log('Sending leave status update notification to department admin:', { notificationType, departmentAdminId });
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  let message = '';
  let status = '';
  let title = '';

  switch (notificationType) {
    case NOTIFICATION_TYPES.LEAVE_HR_APPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been approved by HR and is now waiting for Mayor's approval`;
      status = 'hr_approved';
      title = 'Leave Request HR Approved';
      break;
    case NOTIFICATION_TYPES.LEAVE_HR_DISAPPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been disapproved by HR`;
      status = 'hr_disapproved';
      title = 'Leave Request HR Disapproved';
      break;
    case NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been final approved by the Mayor`;
      status = 'mayor_approved';
      title = 'Leave Request Mayor Approved';
      break;
    case NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been final disapproved by the Mayor`;
      status = 'mayor_disapproved';
      title = 'Leave Request Mayor Disapproved';
      break;
    default:
      message = `Leave request status of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been updated`;
      status = 'updated';
      title = 'Leave Request Status Updated';
  }

  const data = {
    message,
    status,
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days
  };

  const notification = await createNotification('department_admin', departmentAdminId.toString(), notificationType, data);
  
  // Send email notification if user has email
  try {
    const user = await User.findById(departmentAdminId);
    if (user && user.email) {
      console.log('Sending email notification to department admin:', user.email);
      await sendLeaveStatusUpdateEmail(user, data);
    } else {
      console.log('Department admin does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
  
  return notification;
};

// Send notification to HR about leave request status
const sendLeaveStatusUpdateToHR = async (leaveRequest, notificationType, hrId) => {
  console.log('Sending leave status update notification to HR:', { notificationType, hrId });
  
  // Safety check for user data
  if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.user_id.first_name) {
    console.error('Invalid leave request data for notification:', leaveRequest);
    return;
  }
  
  let message = '';
  let status = '';
  let title = '';

  switch (notificationType) {
    case NOTIFICATION_TYPES.LEAVE_MAYOR_APPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been final approved by the Mayor`;
      status = 'mayor_approved';
      title = 'Leave Request Mayor Approved';
      break;
    case NOTIFICATION_TYPES.LEAVE_MAYOR_DISAPPROVED:
      message = `Leave request of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been final disapproved by the Mayor`;
      status = 'mayor_disapproved';
      title = 'Leave Request Mayor Disapproved';
      break;
    default:
      message = `Leave request status of ${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name} has been updated`;
      status = 'updated';
      title = 'Leave Request Status Updated';
  }

  const data = {
    message,
    status,
    employee_name: `${leaveRequest.user_id.first_name} ${leaveRequest.user_id.last_name}`,
    leave_type: leaveRequest.leave_type,
    start_date: leaveRequest.start_date,
    end_date: leaveRequest.end_date,
    number_of_days: leaveRequest.number_of_days
  };

  const notification = await createNotification('hr', hrId.toString(), notificationType, data);
  
  // Send email notification if user has email
  try {
    const user = await User.findById(hrId);
    if (user && user.email) {
      console.log('Sending email notification to HR:', user.email);
      await sendLeaveStatusUpdateEmail(user, data);
    } else {
      console.log('HR user does not have email address or user not found');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
  
  return notification;
};

module.exports = {
  NOTIFICATION_TYPES,
  sendNewLeaveRequestNotification,
  sendRecommendedLeaveRequestNotification,
  sendHrApprovedLeaveRequestNotification,
  sendLeaveStatusUpdateToEmployee,
  sendLeaveStatusUpdateToDepartmentAdmin,
  sendLeaveStatusUpdateToHR
};