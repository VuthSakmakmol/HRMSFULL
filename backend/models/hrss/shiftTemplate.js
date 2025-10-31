// models/hrss/shiftTemplate.js
const mongoose = require('mongoose');

/* ─────────────── validators & helpers ─────────────── */
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/; // 00:00–23:59
const isHHMM = (v) => typeof v === 'string' && HHMM.test(v);
const toMinutes = (hhmm) => {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
};

/* ─────────────── sub-schemas ─────────────── */
const BreakSchema = new mongoose.Schema({
  start: { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  end:   { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  paid:  { type: Boolean, default: false },
}, { _id: false });

const WindowSchema = new mongoose.Schema({
  earliestIn:  { type: String, validate: [v => !v || isHHMM(v), 'Invalid HH:mm'] },
  latestIn:    { type: String, validate: [v => !v || isHHMM(v), 'Invalid HH:mm'] },
  earliestOut: { type: String, validate: [v => !v || isHHMM(v), 'Invalid HH:mm'] },
  latestOut:   { type: String, validate: [v => !v || isHHMM(v), 'Invalid HH:mm'] },
  allowCrossMidnight: { type: Boolean, default: false },
}, { _id: false });

const OTSchema = new mongoose.Schema({
  mode: { type: String, enum: ['DISABLED', 'ANY_MINUTES', 'TIERS'], default: 'DISABLED' },
  startAfterMin: { type: Number, default: 0, min: 0 },
  roundingMin:   { type: Number, default: 0, min: 0 },
  tiers:         [{ type: Number, min: 1 }],
}, { _id: false });

/* ─────────────── main schema ─────────────── */
const ShiftTemplateSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  name:    { type: String, required: true, trim: true },
  code:    { type: String, trim: true },
  active:  { type: Boolean, default: true },

  version:       { type: Number, default: 1, min: 1 },
  effectiveFrom: { type: Date, default: null },
  effectiveTo:   { type: Date, default: null },

  // Core times
  timeIn:    { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  lateAfter: { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  timeOut:   { type: String, required: true, validate: [isHHMM, 'Invalid HH:mm'] },
  crossMidnight: { type: Boolean, default: false },

  breaks: { type: [BreakSchema], default: [] },
  window: { type: WindowSchema, default: undefined },
  ot: { type: OTSchema, default: () => ({}) },

  daysOfWeek: {
    type: [Number],
    validate: {
      validator: (arr) => arr.every(n => n >= 0 && n <= 6),
      message: 'daysOfWeek must be integers 0–6'
    },
    default: []
  },

  excludeHolidays: { type: Boolean, default: false },
}, { timestamps: true });

/* ─────────────── custom validation ─────────────── */
ShiftTemplateSchema.pre('validate', function(next) {
  try {
    const tIn  = toMinutes(this.timeIn);
    const tOut = toMinutes(this.timeOut);
    const tLate = toMinutes(this.lateAfter);

    if (!this.crossMidnight && tOut < tIn)
      throw new Error('timeOut must be ≥ timeIn unless crossMidnight = true');
    if (tLate < tIn)
      throw new Error('lateAfter must be ≥ timeIn');

    for (const b of this.breaks) {
      const s = toMinutes(b.start);
      const e = toMinutes(b.end);
      if (s >= e)
        throw new Error(`Invalid break ${b.start}-${b.end}: start must be before end`);
    }

    if (this.ot?.mode === 'TIERS') {
      const tiers = this.ot.tiers || [];
      if (!tiers.length) throw new Error('OT tiers must not be empty in TIERS mode');
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i] <= tiers[i - 1]) throw new Error('OT tiers must be increasing');
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

/* ─────────────── indexes ─────────────── */
ShiftTemplateSchema.index({ company: 1, name: 1 }, { unique: true });
ShiftTemplateSchema.index({ company: 1, active: 1 });

module.exports = mongoose.model('ShiftTemplate', ShiftTemplateSchema);
