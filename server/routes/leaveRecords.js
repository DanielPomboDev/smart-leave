const express = require('express');
const router = express.Router();
const leaveRecordController = require('../controllers/LeaveRecordController');
const { createLeaveRecordValidation, updateLeaveRecordValidation, addUndertimeValidation, addLeaveCreditsValidation } = require('../middleware/leaveRecordValidation');
const { protect } = require('../middleware/auth');

// All routes need authentication (matches every other route group)
router.use(protect);

// GET /api/leave-records - Get all leave records with optional filtering
router.get('/', leaveRecordController.index);

// GET /api/leave-records/current - Get current leave credits for authenticated user
router.get('/current', leaveRecordController.getCurrentLeaveCredits);

// GET /api/leave-records/entitlements/:userId - Get statutory leave entitlements for an employee (before /:userId)
router.get('/entitlements/:userId', leaveRecordController.getEntitlements);

// GET /api/leave-records/forced-leave-status - Mandatory forced leave tracker (Sec. 25) (before /:userId)
router.get('/forced-leave-status', leaveRecordController.getForcedLeaveStatus);

// GET /api/leave-records/wellness-status - Wellness leave usage tracker (CSC MC No. 1, s. 2026) (before /:userId)
router.get('/wellness-status', leaveRecordController.getWellnessLeaveStatus);

// GET /api/leave-records/audit-logs - Get audit logs for leave-record changes (before /:userId)
router.get('/audit-logs', leaveRecordController.getAuditLogs);

// GET /api/leave-records/:userId - Get leave records for a specific employee
router.get('/:userId', leaveRecordController.show);

// GET /api/leave-records/:userId/monthly - Get leave record for a specific month/year
router.get('/:userId/monthly', leaveRecordController.getMonthlyRecord);

// POST /api/leave-records - Create a new leave record
router.post('/', createLeaveRecordValidation, leaveRecordController.store);

// PUT /api/leave-records/:id - Update a leave record
router.put('/:id', updateLeaveRecordValidation, leaveRecordController.update);

// POST /api/leave-records/add-undertime - Add undertime to a leave record
router.post('/add-undertime', addUndertimeValidation, leaveRecordController.addUndertime);

// POST /api/leave-records/add-credits - Manually add/update earned leave credits
router.post('/add-credits', addLeaveCreditsValidation, leaveRecordController.addCredits);

// POST /api/leave-records/accrue - Run the up-to-now automatic accrual (HR fallback)
router.post('/accrue', leaveRecordController.accrueNow);

module.exports = router;