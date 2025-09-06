// models/hrss/shiftAssignment.js
const mongoose = require('mongoose');

const ShiftAssignmentSchema = new mongoose.Schema({
  company:         { type: String, required: true, index: true },
  employeeId:      { type: String, required: true, trim: true, index: true },
  shiftTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },

  // Date range (inclusive). 'to' can be null = open-ended.
  from: { type: Date, required: true },
  to:   { type: Date, default: null },

  reason:    { type: String, default: '' },
  createdBy: { type: String, default: '' },
  updatedBy: { type: String, default: '' }
}, { timestamps: true });

/* Guard: from <= to if to exists */
ShiftAssignmentSchema.pre('validate', function(next) {
  if (this.to && this.from && this.from > this.to) {
    return next(new Error('ShiftAssignment: `from` must be <= `to`'));
  }
  next();
});

/* Helpful indexes for resolving effective assignment quickly */
ShiftAssignmentSchema.index({ company: 1, employeeId: 1, from: 1 });
ShiftAssignmentSchema.index({ company: 1, employeeId: 1, to: 1 });
ShiftAssignmentSchema.index({ company: 1, shiftTemplateId: 1 });

module.exports = mongoose.model('ShiftAssignment', ShiftAssignmentSchema);
