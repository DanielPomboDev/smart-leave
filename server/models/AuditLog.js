const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // The employee whose record was changed
  user_id: {
    type: String,
    ref: 'User'
  },
  // Who made the change
  actor_id: {
    type: String
  },
  actor_name: {
    type: String
  },
  action: {
    type: String,
    enum: [
      'add_record',
      'update_record',
      'add_undertime',
      'add_credits',
      'calculate_credits',
      'other'
    ],
    default: 'other'
  },
  entity: {
    type: String,
    default: 'LeaveRecord'
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId
  },
  before: {
    type: Object
  },
  after: {
    type: Object
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

auditLogSchema.index({ user_id: 1, createdAt: -1 });
auditLogSchema.index({ actor_id: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
