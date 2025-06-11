const ActivityLog = require('../models/ta/ActivityLog');

exports.logActivity = async ({
  actionType, 
  collectionName, 
  documentId,
  previousData = null, 
  newData = null,
  performedBy, 
  company,
}) => {
  try {
    await ActivityLog.create({
      actionType,
      collectionName,
      documentId,
      previousData,
      newData,
      performedBy,
      company
    });
  } catch (err) {
    console.error('❌ Failed to log activity:', err.message);
  }
};
