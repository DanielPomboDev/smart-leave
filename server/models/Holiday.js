const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // regular = regular holiday, special_non_working = special non-working day,
  // local = LGU-declared local holiday, special_working = special working holiday (still a work day)
  category: {
    type: String,
    enum: ['regular', 'special_non_working', 'local', 'special_working'],
    default: 'regular'
  },
  // If true, the holiday recurs every year on the same month/day as `date`.
  // If false, it only applies on the exact `date` stored (a one-off holiday).
  recurring: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate holidays on the same date + name
holidaySchema.index({ name: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
