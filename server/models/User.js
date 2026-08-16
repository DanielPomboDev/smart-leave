const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  first_name: {
    type: String,
    required: true
  },
  middle_initial: {
    type: String
  },
  last_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  department_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  position: {
    type: String
  },
  salary: {
    type: Number
  },
  start_date: {
    type: Date
  },
  password: {
    type: String,
    required: true
  },
  user_type: {
    type: String,
    enum: ['employee', 'hr', 'department_admin', 'mayor'],
    default: 'employee'
  },
  appointment_status: {
    type: String,
    enum: ['permanent', 'temporary', 'co_terminus', 'contractual', 'casual', 'job_order', 'elected_official', 'other'],
    default: 'permanent'
  },
  // Part-time weekly hours (Sec. 2: part-time employees earn leave proportionally to
  // hours rendered — e.g. 20 hrs/week earns 7.5 VL + 7.5 SL per year). null/40 = full-time.
  part_time_weekly_hours: {
    type: Number,
    default: null,
    min: 0,
    max: 40
  },
  // Solo parent (RA 8972): qualifies for the 7-day solo parent leave and the
  // additional 15 days of paid maternity leave under RA 11210 (105 + 15 = 120).
  solo_parent: {
    type: Boolean,
    default: false
  },
  profile_image: {
    type: String
  },
  signature: {
    type: String
  },
  // Set true when an account is created with the default password — the user
  // must pick their own password before using the system.
  mustChangePassword: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for full name
userSchema.virtual('full_name').get(function() {
  return `${this.first_name}${this.middle_initial ? ' ' + this.middle_initial + '.' : ''} ${this.last_name}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true
});

// Populate department when fetching user
userSchema.pre(/^find/, function(next) {
  this.populate('department_id');
  next();
});

// Add pagination plugin
userSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('User', userSchema);