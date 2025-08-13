const mongoose = require('mongoose');

const workCalendarSchema = new mongoose.Schema({
  company:   { type: String, required: true, index: true },
  date:      { type: Date,   required: true }, // store as 00:00:00 local
  dayType:   { type: String, enum: ['Working', 'Sunday', 'Holiday', 'SpecialWorking'], default: 'Working' },
  description: { type: String, default: '' }
}, { timestamps: true });

workCalendarSchema.index({ company: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkCalendar', workCalendarSchema);
