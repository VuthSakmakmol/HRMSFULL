const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actionType: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'], required: true },
  collectionName: { type: String, required: true },
  documentId: { type: String, required: true },
  previousData: mongoose.Schema.Types.Mixed,
  newData: mongoose.Schema.Types.Mixed,
  performedBy: { type: String, required: true },
  company: String,
  performedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
