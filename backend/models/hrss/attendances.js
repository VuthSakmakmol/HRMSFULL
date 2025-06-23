const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },       // Must match an existing employee
  date: { type: Date, required: true },               // Date of attendance
  shiftType: {
    type: String,
    enum: ['Day Shift', 'Night Shift'], // <- match this exactly
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
  note: { type: String, default: '' }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true }); // prevent duplicates

module.exports = mongoose.model('Attendance', attendanceSchema);
