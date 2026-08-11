const Holiday = require('../models/Holiday');
const { getHolidayDates, toDateStr } = require('../utils/holidayUtils');

// @desc    Get holidays, optionally for a specific year
// @route   GET /api/holidays?year=YYYY
// @access  Private
const index = async (req, res) => {
  try {
    const { year } = req.query;
    let holidays;

    if (year) {
      // Resolve recurring holidays to the queried year and attach the original _id
      const y = parseInt(year);
      const raw = await Holiday.find().sort({ date: 1 }).exec();
      holidays = raw
        .map(h => {
          const base = new Date(h.date);
          let effective;
          if (h.recurring) {
            effective = new Date(y, base.getMonth(), base.getDate());
          } else {
            if (base.getFullYear() !== y) return null;
            effective = base;
          }
          return { ...h.toObject(), date_in_year: toDateStr(effective) };
        })
        .filter(Boolean)
        .sort((a, b) => a.date_in_year.localeCompare(b.date_in_year));
    } else {
      holidays = await Holiday.find().sort({ date: 1 }).exec();
    }

    res.json({ success: true, holidays });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching holidays' });
  }
};

// @desc    Create a holiday
// @route   POST /api/holidays
// @access  Private (HR only)
const store = async (req, res) => {
  try {
    if (req.user.user_type !== 'hr') {
      return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
    }

    const { name, date, category, recurring } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Holiday name and date are required' });
    }

    const validCategories = ['regular', 'special_non_working', 'local', 'special_working'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid holiday category' });
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const existing = await Holiday.findOne({ name, date: parsed });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A holiday with this name already exists on this date' });
    }

    const holiday = new Holiday({
      name,
      date: parsed,
      category: category || 'regular',
      recurring: recurring === undefined ? true : !!recurring
    });

    await holiday.save();
    res.status(201).json({ success: true, message: 'Holiday added successfully', holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ success: false, message: 'Server error while creating holiday' });
  }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private (HR only)
const update = async (req, res) => {
  try {
    if (req.user.user_type !== 'hr') {
      return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
    }

    const { name, date, category, recurring } = req.body;
    const holiday = await Holiday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (name !== undefined) holiday.name = name;
    if (date !== undefined) {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date' });
      }
      holiday.date = parsed;
    }
    if (category !== undefined) {
      const validCategories = ['regular', 'special_non_working', 'local', 'special_working'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: 'Invalid holiday category' });
      }
      holiday.category = category;
    }
    if (recurring !== undefined) holiday.recurring = !!recurring;

    await holiday.save();
    res.json({ success: true, message: 'Holiday updated successfully', holiday });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ success: false, message: 'Server error while updating holiday' });
  }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private (HR only)
const destroy = async (req, res) => {
  try {
    if (req.user.user_type !== 'hr') {
      return res.status(403).json({ success: false, message: 'Access denied. HR access required.' });
    }

    const holiday = await Holiday.findByIdAndDelete(req.params.id);

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting holiday' });
  }
};

module.exports = { index, store, update, destroy };
