const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  timeIn: { type: String, default: '' },     // e.g. "07:12"
  status: { type: String, default: '' },     // On Time, Late, Absent, Permission
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  fullName: { type: String, required: true },
  month: { type: String, required: true },   // Format: "2025-06"

  // 🗓️ Day-by-day attendance: 1 to 31
  days: {
    1: { type: daySchema, default: () => ({}) },
    2: { type: daySchema, default: () => ({}) },
    3: { type: daySchema, default: () => ({}) },
    4: { type: daySchema, default: () => ({}) },
    5: { type: daySchema, default: () => ({}) },
    6: { type: daySchema, default: () => ({}) },
    7: { type: daySchema, default: () => ({}) },
    8: { type: daySchema, default: () => ({}) },
    9: { type: daySchema, default: () => ({}) },
    10: { type: daySchema, default: () => ({}) },
    11: { type: daySchema, default: () => ({}) },
    12: { type: daySchema, default: () => ({}) },
    13: { type: daySchema, default: () => ({}) },
    14: { type: daySchema, default: () => ({}) },
    15: { type: daySchema, default: () => ({}) },
    16: { type: daySchema, default: () => ({}) },
    17: { type: daySchema, default: () => ({}) },
    18: { type: daySchema, default: () => ({}) },
    19: { type: daySchema, default: () => ({}) },
    20: { type: daySchema, default: () => ({}) },
    21: { type: daySchema, default: () => ({}) },
    22: { type: daySchema, default: () => ({}) },
    23: { type: daySchema, default: () => ({}) },
    24: { type: daySchema, default: () => ({}) },
    25: { type: daySchema, default: () => ({}) },
    26: { type: daySchema, default: () => ({}) },
    27: { type: daySchema, default: () => ({}) },
    28: { type: daySchema, default: () => ({}) },
    29: { type: daySchema, default: () => ({}) },
    30: { type: daySchema, default: () => ({}) },
    31: { type: daySchema, default: () => ({}) },
  },

  // 🚨 Alert fields
  absentCount: { type: Number, default: 0 },
  alert: { type: Boolean, default: false },     // Absent 4-5 days
  abandon: { type: Boolean, default: false },   // Absent 6+ days
}, {
  timestamps: true
});

attendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
