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
      'special_emergency', 'adoption_leave', 'others_specify',
      'monetization', 'terminal_leave'
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
  location_specify: {
    type: String
  },
  commutation: {
    type: Boolean,
    default: false
  },
  without_pay: {
    type: Boolean,
    default: false
  },
  // Terminal leave context — only used when leave_type === 'terminal_leave'.
  // CSC: terminal leave is granted upon actual retirement / resignation / separation
  // from the service, and commutes the FULL accumulated vacation + sick leave balance.
  separation_type: {
    type: String,
    enum: ['retirement', 'resignation', 'separation'],
    required: false
  },
  // Split of terminal leave days across vacation / sick credits, computed at approval
  // time (vacation credits are consumed first, the remainder from sick credits).
  vacation_days: {
    type: Number
  },
  sick_days: {
    type: Number
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
  },
  mayor_approved_by: {
    type: String,
    ref: 'User'
  },
  mayor_approved_at: {
    type: Date
  },
  // 7.A Certification of Leave Credits (performed by the HR manager during approval)
  credits_certified: {
    type: Boolean,
    default: false
  },
  credits_certified_by: {
    type: String,
    ref: 'User'
  },
  credits_certified_at: {
    type: Date
  },
  certified_balances: {
    vacation: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 }
    },
    sick: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 }
    }
  },
  applicant_signature: {
    type: String
  },
  hr_signature: {
    type: String
  },
  department_signature: {
    type: String
  },
  mayor_signature: {
    type: String
  },
  documents: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String
    },
    resource_type: {
      type: String,
      enum: ['image', 'raw']
    },
    mimetype: {
      type: String
    },
    size: {
      type: Number
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  // Official signed PDF of the finalized form (PNPKI-signed by approvers in Adobe
  // Reader after printing/saving from the CS Form 6). Kept alongside the digital record.
  official_pdf: {
    url: {
      type: String
    },
    public_id: {
      type: String
    },
    name: {
      type: String
    },
    uploaded_at: {
      type: Date
    },
    uploaded_by: {
      type: String,
      ref: 'User'
    },
    uploaded_by_name: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Populate user when fetching leave requests
leaveRequestSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user_id',
    select: 'first_name last_name middle_initial department_id position user_id profile_image salary',
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