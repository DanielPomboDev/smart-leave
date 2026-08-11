const express = require('express');
const { createLeaveRequest, getLeaveRequests, getLeaveRequest, getLeaveCalendar, cancelLeaveRequest, updateSignatures, uploadLeaveDocuments, deleteLeaveDocument, uploadOfficialPdf, deleteOfficialPdf } = require('../controllers/LeaveController');
const { protect } = require('../middleware/auth');
const leaveUpload = require('../middleware/leaveUpload');

const router = express.Router();

// All routes need authentication
router.use(protect);

// Create a new leave request
router.post('/', createLeaveRequest);

// Get all leave requests for the authenticated user
router.get('/', getLeaveRequests);

// Get leave requests for the team calendar (must be before /:id)
router.get('/calendar', getLeaveCalendar);

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

// Upload the official signed PDF of a leave request
router.post('/:id/official-pdf', protect, leaveUpload.single('file'), uploadOfficialPdf);

// Remove the official signed PDF of a leave request
router.delete('/:id/official-pdf', deleteOfficialPdf);

module.exports = router;