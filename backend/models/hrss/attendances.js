// models/hrss/attendances.js
const mongoose = require('mongoose');

const ShiftBreakSnapshotSchema = new mongoose.Schema({
  start: { type: String },  // HH:mm
  end:   { type: String },  // HH:mm
  paid:  { type: Boolean, default: false }
}, { _id: false });

const ShiftWindowSnapshotSchema = new mongoose.Schema({
  earliestIn:  { type: String }, // HH:mm
  latestIn:    { type: String }, // HH:mm
  earliestOut: { type: String }, // HH:mm
  latestOut:   { type: String }, // HH:mm
  allowCrossMidnight: { type: Boolean, default: false }
}, { _id: false });

const OTSnapshotSchema = new mongoose.Schema({
  mode:          { type: String },         // 'DISABLED' | 'ANY_MINUTES' | 'TIERS'
  startAfterMin: { type: Number, default: 0 },
  roundingMin:   { type: Number, default: 0 },
  tiers:         [{ type: Number }]
}, { _id: false });

const ShiftSnapshotSchema = new mongoose.Schema({
  version:   { type: Number, default: 1 },
  name:      { type: String, default: '' },   // helpful for debugging
  timeIn:    { type: String },                // HH:mm
  lateAfter: { type: String },                // HH:mm
  timeOut:   { type: String },                // HH:mm
  breaks:    { type: [ShiftBreakSnapshotSchema], default: [] },
  window:    { type: ShiftWindowSnapshotSchema, default: undefined },
  ot:        { type: OTSnapshotSchema, default: undefined }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date:       { type: Date,   required: true },

  // ───── Legacy field (kept for compatibility) ─────
  // NOTE: We will stop relying on this once templates + assignments are fully used.
  shiftType: {
    type: String,
    enum: ['Day Shift', 'Night Shift'],
    required: true
  },

  // ───── New template linkage & snapshot ─────
  shiftTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', default: null },
  shiftName:       { type: String, default: '' },         // snapshot name (e.g., "Morning", "Pregnancy")
  shiftSnapshot:   { type: ShiftSnapshotSchema, default: undefined },

  fullName: { type: String, default: '' },

  timeIn:  { type: Date, default: null },
  timeOut: { type: Date, default: null },

  lateMinutes:   { type: Number, default: 0 },
  workedHours:   { type: Number, default: 0 },
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

  leaveType: {
    type: String,
    enum: ['Sick Leave', 'Annual Leave', 'Maternity Leave', 'Unpaid Leave', 'Special Leave', null],
    default: null
  },

  note: { type: String, default: '' },

  company: { type: String, required: true },

  // Evaluation flags (e.g., scan outside window)
  flags: { type: [String], default: [] }
}, { timestamps: true });

// unique per employeeId+date+company (keep existing)
attendanceSchema.index({ employeeId: 1, date: 1, company: 1 }, { unique: true });

// Helpful index for analytics by template
attendanceSchema.index({ company: 1, shiftTemplateId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
