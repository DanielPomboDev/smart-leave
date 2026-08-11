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

// POST /api/leave-records/calculate-credits - Calculate and award monthly leave credits
router.post('/calculate-credits', leaveRecordController.calculateCredits);

module.exports = router;