const express = require('express');
const { createLeaveRequest, getLeaveRequests, getLeaveRequest, cancelLeaveRequest, updateSignatures, uploadLeaveDocuments, deleteLeaveDocument } = require('../controllers/LeaveController');
const { protect } = require('../middleware/auth');
const leaveUpload = require('../middleware/leaveUpload');

const router = express.Router();

// All routes need authentication
router.use(protect);

// Create a new leave request
router.post('/', createLeaveRequest);

// Get all leave requests for the authenticated user
router.get('/', getLeaveRequests);

// Get a specific leave request
router.get('/:id', getLeaveRequest);

// Cancel a leave request
router.delete('/:id', cancelLeaveRequest);

// Update digital signatures on a leave request
router.post('/:id/signatures', updateSignatures);

// Upload supporting documents to a leave request
router.post('/:id/documents', protect, leaveUpload.array('documents', 5), uploadLeaveDocuments);

// Delete a document from a leave request
router.delete('/:id/documents/:docId', deleteLeaveDocument);

module.exports = router;