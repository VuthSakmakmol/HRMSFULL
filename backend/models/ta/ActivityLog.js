const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  actionType: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'], required: true },
  collectionName: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: false },
  previousData: { type: Object, default: null },
  newData: { type: Object, default: null },
  performedBy: { type: String, required: true }, // email
  company: { type: String, required: true },
  performedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
