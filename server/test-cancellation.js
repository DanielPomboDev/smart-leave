const mongoose = require('mongoose');
const LeaveRequest = require('./models/LeaveRequest');
const LeaveRecord = require('./models/LeaveRecord');
const User = require('./models/User');

// Mock request object to simulate the authenticated user
const mockReq = {
  params: { id: null },  // Will be set to specific leave request ID
  user: { user_id: null }  // Will be set to specific user
};

// Mock response object
const mockRes = {
  status: function(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json: function(data) {
    console.log('Response:', data);
    return this;
  },
  statusCode: null
};

// Function to cancel an approved leave request and return credits
async function testCancelApprovedLeave(leaveRequestId, userId) {
  // Update mock request with actual values
  mockReq.params.id = leaveRequestId;
  mockReq.user.user_id = userId;

  // Import the cancelLeaveRequest function
  const { cancelLeaveRequest } = require('./controllers/LeaveController');
  
  // Execute the cancellation
  console.log(`Cancelling leave request ${leaveRequestId} for user ${userId}`);
  await cancelLeaveRequest(mockReq, mockRes);
  
  // Verify the changes in the database
  const updatedLeaveRequest = await LeaveRequest.findById(leaveRequestId);
  console.log('Leave request status after cancellation:', updatedLeaveRequest.status);
  
  if (updatedLeaveRequest.status === 'cancelled') {
    console.log('✅ Leave request successfully cancelled');
  } else {
    console.log('❌ Leave request was not cancelled properly');
  }
  
  // If the leave was approved, also check if credits were returned
  if (updatedLeaveRequest.status === 'cancelled' && updatedLeaveRequest.leave_type) {
    // Get the month and year when the leave was scheduled
    const leaveDate = new Date(updatedLeaveRequest.start_date);
    const leaveMonth = leaveDate.getMonth() + 1; 
    const leaveYear = leaveDate.getFullYear();
    
    // Find the corresponding leave record
    const leaveRecord = await LeaveRecord.findOne({
      user_id: userId,
      month: leaveMonth,
      year: leaveYear
    });
    
    if (leaveRecord) {
      console.log('Leave record after cancellation:');
      console.log('  - Vacation used:', leaveRecord.vacation_used);
      console.log('  - Vacation balance:', leaveRecord.vacation_balance);
      console.log('  - Sick used:', leaveRecord.sick_used);
      console.log('  - Sick balance:', leaveRecord.sick_balance);
    }
  }
}

// Example usage - you'll need to provide actual leave request and user IDs from your database
async function runTest() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/smart-leave', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to database');
    
    // Find an approved leave request to test with
    const approvedLeaveRequest = await LeaveRequest.findOne({ status: 'approved' });
    if (!approvedLeaveRequest) {
      console.log('No approved leave requests found in the database to test with');
      return;
    }
    
    console.log('Found approved leave request:', approvedLeaveRequest._id.toString());
    console.log('Leave type:', approvedLeaveRequest.leave_type);
    console.log('Number of days:', approvedLeaveRequest.number_of_days);
    
    // Get the user ID from the leave request
    const userId = approvedLeaveRequest.user_id && typeof approvedLeaveRequest.user_id === 'object' 
      ? approvedLeaveRequest.user_id.user_id 
      : approvedLeaveRequest.user_id;
    
    console.log('User ID:', userId);
    
    // Check initial balances before cancellation
    const leaveDate = new Date(approvedLeaveRequest.start_date);
    const leaveMonth = leaveDate.getMonth() + 1; 
    const leaveYear = leaveDate.getFullYear();
    
    const initialLeaveRecord = await LeaveRecord.findOne({
      user_id: userId,
      month: leaveMonth,
      year: leaveYear
    });
    
    if (initialLeaveRecord) {
      console.log('Initial leave record:');
      console.log('  - Vacation used:', initialLeaveRecord.vacation_used);
      console.log('  - Vacation balance:', initialLeaveRecord.vacation_balance);
      console.log('  - Sick used:', initialLeaveRecord.sick_used);
      console.log('  - Sick balance:', initialLeaveRecord.sick_balance);
    }
    
    // Now test the cancellation
    await testCancelApprovedLeave(approvedLeaveRequest._id.toString(), userId);
    
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
runTest();