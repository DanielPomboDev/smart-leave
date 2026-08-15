const mongoose = require('mongoose');

const leaveRecordSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  vacation_earned: {
    type: Number,
    default: 1.25
  },
  vacation_used: {
    type: Number,
    default: 0
  },
  vacation_balance: {
    type: Number,
    default: 0
  },
  sick_earned: {
    type: Number,
    default: 1.25
  },
  sick_used: {
    type: Number,
    default: 0
  },
  sick_balance: {
    type: Number,
    default: 0
  },
  undertime_hours: {
    type: Number,
    default: 0
  },
  vacation_entries: {
    type: [Object],
    default: []
  },
  sick_entries: {
    type: [Object],
    default: []
  },
  lwop_days: {
    type: Number,
    default: 0
  },
  // True when the monthly credits were computed by the automated accrual job or the
  // HR "Calculate Credits" batch. Manually edited records (addCredits / create/update)
  // are flagged false so the recompute-on-change job never clobbers HR corrections.
  auto_calculated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create index for faster queries
leaveRecordSchema.index({ user_id: 1, year: 1, month: 1 });

// Unique constraint for user + month/year combination
leaveRecordSchema.index({ user_id: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveRecord', leaveRecordSchema);