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
  profile_image: {
    type: String
  },
  fcm_token: {
    type: String
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