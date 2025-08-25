const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date:       { type: Date,   required: true },

  shiftType: {
    type: String,
    enum: ['Day Shift', 'Night Shift'],
    required: true
  },

  fullName: { type: String, default: '' },

  timeIn:  { type: Date, default: null },
  timeOut: { type: Date, default: null },

  // lateness after skipping the break (saved by controller)
  lateMinutes:   { type: Number, default: 0 },

  // optional KPI you may fill elsewhere
  workedHours:   { type: Number, default: 0 },

  // controller stores hours as decimal (e.g., 1.5)
  overtimeHours: { type: Number, default: 0 },

  department: { type: String, default: '' },
  position:   { type: String, default: '' },
  line:       { type: String, default: '' },

  status: {
    type: String,
    enum: ['OnTime', 'Late', 'Absent', 'Leave'],
    default: 'Absent'
  },

  riskStatus: {
    type: String,
    enum: ['None', 'NearlyAbandon', 'Abandon', 'Risk'],
    default: 'None'
  },

  evaluate: {
    type: String,
    enum: ['None', 'Evaluate1', 'Evaluate2', 'Evaluate3'],
    default: 'None'
  },

  // allow null explicitly so enum validation won't reject it
  leaveType: {
    type: String,
    enum: ['Sick Leave', 'Annual Leave', 'Maternity Leave', 'Unpaid Leave', 'Special Leave', null],
    default: null
  },

  note: { type: String, default: '' },

  company: { type: String, required: true }
}, { timestamps: true });

// unique per employeeId+date+company
attendanceSchema.index({ employeeId: 1, date: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
