// Load all models to ensure proper registration
require('./User');
require('./Department');
require('./LeaveRequest');
require('./LeaveRecommendation');
require('./LeaveApproval');
require('./LeaveRecord');
require('./Holiday');
require('./AuditLog');

console.log('All models loaded successfully');