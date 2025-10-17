// Whitelist models that are allowed to be restored via ActivityLog.
// Add to this object as you enable more collections for restore.
module.exports = {
  User: require('../models/User'),
  ActivityLog: require('../models/ta/ActivityLog'),
  // Example: uncomment / add as needed
  // EmployeeDirectory: require('../models/ta/EmployeeDirectory'),
  // ShiftTemplate: require('../models/ta/ShiftTemplate'),
};
