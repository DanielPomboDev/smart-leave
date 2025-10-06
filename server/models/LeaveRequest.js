const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  leave_type: {
    type: String,
    enum: [
      'vacation', 'sick',
      'mandatory_forced_leave', 'maternity_leave', 'paternity_leave', 
      'special_privilege_leave', 'solo_parent_leave', 'study_leave', 
      'vawc_leave', 'rehabilitation_privilege', 'special_leave_benefits_women', 
      'special_emergency', 'adoption_leave', 'others_specify'
    ],
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  number_of_days: {
    type: Number,
    required: true
  },
  where_spent: {
    type: String,
    required: false  // Made optional since not all leave types require location info
  },
  commutation: {
    type: Boolean,
    default: false
  },
  without_pay: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'recommended', 'hr_approved', 'approved', 'disapproved', 'cancelled'],
    default: 'pending'
  },
  department_comments: {
    type: String
  },
  department_approved_by: {
    type: String,
    ref: 'User'
  },
  department_approved_at: {
    type: Date
  },
  hr_comments: {
    type: String
  },
  hr_approved_by: {
    type: String,
    ref: 'User'
  },
  hr_approved_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Populate user when fetching leave requests
leaveRequestSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user_id',
    select: 'first_name last_name middle_initial department_id position user_id profile_image',
    foreignField: 'user_id',  // Match User's user_id field instead of _id
    localField: 'user_id',     // Use LeaveRequest's user_id field
    populate: {
      path: 'department_id',
      select: 'name'
    }
  });
  next();
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);