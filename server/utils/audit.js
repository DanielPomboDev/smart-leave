const AuditLog = require('../models/AuditLog');

// Record an audit entry for a leave-record change.
//   actor: the authenticated user making the change (req.user)
//   action: one of the AuditLog.action enum values
//   user_id: the employee whose record changed
//   entity_id: the LeaveRecord _id (optional)
//   before / after: plain objects with the changed fields (optional)
//   details: human-readable summary (optional)
const logAudit = async ({ actor, action, user_id, entity_id, before, after, details }) => {
  try {
    const actorName = actor
      ? `${actor.first_name || ''}${actor.middle_initial ? ' ' + actor.middle_initial + '.' : ''} ${actor.last_name || ''}`.trim()
      : 'System';

    const entry = new AuditLog({
      user_id,
      actor_id: actor ? actor.user_id : null,
      actor_name: actorName,
      action,
      entity_id,
      before: before || undefined,
      after: after || undefined,
      details
    });
    await entry.save();
    return entry;
  } catch (error) {
    console.error('Error writing audit log:', error);
    return null;
  }
};

module.exports = { logAudit };
