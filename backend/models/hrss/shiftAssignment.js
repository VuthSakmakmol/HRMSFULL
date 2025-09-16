// models/hrss/shiftAssignment.js
const mongoose = require('mongoose');

const ShiftAssignmentSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true }, // business ID (string)
  shiftTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true, index: true },
  from: { type: Date, required: true, index: true },
  to:   { type: Date, default: null, index: true },
  reason: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

ShiftAssignmentSchema.index({ company: 1, employeeId: 1, from: 1 });
ShiftAssignmentSchema.index({ company: 1, shiftTemplateId: 1 });

module.exports = mongoose.model('ShiftAssignment', ShiftAssignmentSchema);
