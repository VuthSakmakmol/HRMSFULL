const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: Date, required: true },
  shiftType: {
    type: String,
    enum: ['Day Shift', 'Night Shift'],
    required: true
  },
  fullName: { type: String, default: '' },

  timeIn: { type: Date, default: null },
  timeOut: { type: Date, default: null },
  workedHours: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['OnTime', 'Late', 'Permission', 'Absent', 'NearlyAbandon', 'Abandon', 'Overtime'],
    default: 'Absent'
  },

  permission: { type: Boolean, default: false },
  note: { type: String, default: '' },

  // ✅ Company field for multi-tenant separation
  company: { type: String, required: true }
}, { timestamps: true });

// Ensure uniqueness per employee per date per company
attendanceSchema.index({ employeeId: 1, date: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
