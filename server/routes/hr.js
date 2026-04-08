const express = require('express');
const {
  getHRDashboardStats,
  getHRDepartments,
  getHRLeaveRequests,
  getHRLeaveRequest,
  processHRLeaveApproval,
  getHRLeaveRecords,
  getHRReports
} = require('../controllers/HRController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes need authentication
router.use(protect);

// Get HR dashboard statistics
router.get('/dashboard', getHRDashboardStats);

// Get all departments
router.get('/departments', getHRDepartments);

// Get all leave requests for HR
router.get('/leave-requests', getHRLeaveRequests);

// Get a specific leave request for HR
router.get('/leave-requests/:id', getHRLeaveRequest);

// Process HR leave approval
router.post('/leave-requests/:id/approve', processHRLeaveApproval);

// Get leave records for HR
router.get('/leave-records', getHRLeaveRecords);

// Get reports data
router.get('/reports', getHRReports);

module.exports = router;