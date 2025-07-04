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
  department: { type: String, default: '' }, 
  position: { type: String, default: '' },   
  line: { type: String, default: '' },    

  status: {
    type: String,
    enum: ['OnTime', 'Late', 'Absent', 'Leave'],
    default: 'Absent',
  },
  overtimeHours: {
    type: Number,
    default: 0, // store in hours (e.g., 1.5 for 1 hour 30 minutes)
  },

  riskStatus: {
    type: String,
    enum: [
      'None',          // default normal state
      'NearlyAbandon', // 3-5 consecutive Absents
      'Abandon',       // 6+ consecutive Absents
      'Risk',          // returned after risk period but not yet evaluated
    ],
    default: 'None',
  },
  evaluate: {
    type: String,
    enum: ['None', 'Evaluate1', 'Evaluate2', 'Evaluate3'],
    default: 'None'
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
