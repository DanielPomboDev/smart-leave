const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/HolidayController');
const { protect } = require('../middleware/auth');

// All routes need authentication
router.use(protect);

// GET /api/holidays - Get holidays (optionally ?year=YYYY)
router.get('/', holidayController.index);

// POST /api/holidays - Create a holiday (HR only)
router.post('/', holidayController.store);

// PUT /api/holidays/:id - Update a holiday (HR only)
router.put('/:id', holidayController.update);

// DELETE /api/holidays/:id - Delete a holiday (HR only)
router.delete('/:id', holidayController.destroy);

module.exports = router;
