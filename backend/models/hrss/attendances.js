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
    enum: ['OnTime', 'Late', 'Absent', 'NearlyAbandon', 'Abandon', 'Overtime', 'Leave'], 
    default: 'Absent'
  },

  leaveType: {
    type: String,
    enum: ['Sick Leave', 'Annual Leave', 'Maternity Leave', 'Unpaid Leave', 'Specail Leave'],
    default: null
  },

  note: { type: String, default: '' },

  company: { type: String, required: true }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
