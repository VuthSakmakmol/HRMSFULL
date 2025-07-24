// models/hrss/excome/EmployeeMonthlySnapshot.js
const mongoose = require('mongoose');

// Subdocument schema for each month's data
const monthlyEntrySchema = new mongoose.Schema({
  month: { type: Number, required: true }, // 0-based (0 = Jan)
  directLabor: { type: Number, default: 0 },
  marketing: { type: Number, default: 0 },
  indirectLabor: { type: Number, default: 0 }
}, { _id: false });

const employeeMonthlySnapshotSchema = new mongoose.Schema({
  company: { type: String, required: true },
  year: { type: Number, required: true },
  months: { type: [monthlyEntrySchema], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure only one snapshot per company-year
employeeMonthlySnapshotSchema.index({ company: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeMonthlySnapshot', employeeMonthlySnapshotSchema);
