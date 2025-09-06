// models/hrss/shiftTemplate.js
const mongoose = require('mongoose');

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;  // 00:00 .. 23:59
const isHHMM = (s) => typeof s === 'string' && HHMM.test(s);
const toMinutes = (s) => {
  if (!isHHMM(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const BreakSchema = new mongoose.Schema({
  start: { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  end:   { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  paid:  { type: Boolean, default: false }
}, { _id: false });

/**
 * Optional scan windows. If provided, evaluator can validate whether scans "belong" to this shift.
 */
const WindowSchema = new mongoose.Schema({
  earliestIn:  { type: String, validate: [v => (!v || isHHMM(v)), 'Invalid HH:mm'] },
  latestIn:    { type: String, validate: [v => (!v || isHHMM(v)), 'Invalid HH:mm'] },
  earliestOut: { type: String, validate: [v => (!v || isHHMM(v)), 'Invalid HH:mm'] },
  latestOut:   { type: String, validate: [v => (!v || isHHMM(v)), 'Invalid HH:mm'] },
  allowCrossMidnight: { type: Boolean, default: false }
}, { _id: false });

/**
 * Overtime policy: disabled, any minutes past timeOut (with optional rounding), or discrete tiers (e.g., 120/180/240).
 */
const OTSchema = new mongoose.Schema({
  mode: { type: String, enum: ['DISABLED', 'ANY_MINUTES', 'TIERS'], default: 'DISABLED' },
  startAfterMin: { type: Number, default: 0, min: 0 },   // grace after timeOut
  roundingMin:   { type: Number, default: 0, min: 0 },   // 0 means no rounding
  tiers:         [{ type: Number, min: 1 }]              // only used if mode='TIERS'
}, { _id: false });

const ShiftTemplateSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },

  name:    { type: String, required: true, trim: true },
  code:    { type: String, trim: true },
  active:  { type: Boolean, default: true },

  version:       { type: Number, default: 1, min: 1 },
  effectiveFrom: { type: Date, default: null },
  effectiveTo:   { type: Date, default: null },

  // Core times (local HH:mm)
  timeIn:    { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  lateAfter: { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  timeOut:   { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },

  breaks: { type: [BreakSchema], default: [] },

  window: { type: WindowSchema, default: undefined },

  ot: { type: OTSchema, default: () => ({ mode: 'DISABLED', startAfterMin: 0, roundingMin: 0, tiers: [] }) },

  // Applicability (optional)
  daysOfWeek: { type: [Number], default: [], validate: {
    validator: (arr) => Array.isArray(arr) && arr.every(n => Number.isInteger(n) && n >= 0 && n <= 6),
    message: 'daysOfWeek must contain integers 0..6'
  }},
  excludeHolidays: { type: Boolean, default: false }
}, { timestamps: true });

/* ───────── Custom validations ───────── */
ShiftTemplateSchema.pre('validate', function(next) {
  try {
    // Breaks: start < end (same-day breaks only)
    for (const b of (this.breaks || [])) {
      const a = toMinutes(b.start);
      const z = toMinutes(b.end);
      if (a == null || z == null || a >= z) {
        return next(new Error(`Invalid break window ${b.start}-${b.end}; must be same-day and start < end`));
      }
    }

    // If window ranges provided, ensure HH:mm validity is already covered by schema validators.

    // If OT mode is TIERS, require non-empty increasing tiers
    if (this.ot?.mode === 'TIERS') {
      const tiers = Array.isArray(this.ot.tiers) ? this.ot.tiers.slice() : [];
      if (!tiers.length) return next(new Error('OT tiers must be non-empty when mode=TIERS'));
      for (let i = 0; i < tiers.length; i++) {
        if (!(Number.isFinite(tiers[i]) && tiers[i] > 0)) {
          return next(new Error('OT tiers must be positive numbers (minutes)'));
        }
        if (i > 0 && tiers[i] <= tiers[i-1]) {
          return next(new Error('OT tiers must be strictly increasing'));
        }
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

/* ───────── Indexes ───────── */
ShiftTemplateSchema.index({ company: 1, name: 1 }, { unique: true });
ShiftTemplateSchema.index({ company: 1, active: 1 });
ShiftTemplateSchema.index({ company: 1, effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model('ShiftTemplate', ShiftTemplateSchema);
