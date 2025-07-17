// models/hrss/manpowerTarget.js
const mongoose = require('mongoose');

const manpowerTargetSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  // yearMonth in "YYYY-MM" format
  yearMonth: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  target: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// ensure one target per company+department+position+month
manpowerTargetSchema.index(
  { company: 1, department: 1, position: 1, yearMonth: 1 },
  { unique: true }
);

module.exports = mongoose.model('ManpowerTarget', manpowerTargetSchema);
