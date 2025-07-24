// models/hrss/excome/EmployeeMonthlySnapshot.js
const mongoose = require('mongoose');

const employeeMonthlySnapshotSchema = new mongoose.Schema({
  company: { type: String, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 0-based (0 = Jan)
  directLabor: { type: Number, default: 0 },
  marketing: { type: Number, default: 0 },
  indirectLabor: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

employeeMonthlySnapshotSchema.index({ company: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeMonthlySnapshot', employeeMonthlySnapshotSchema);
