// models/hrss/workCalendar.js
const mongoose = require('mongoose');

const workCalendarSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  date:    { type: Date, required: true }, // stored at Phnom Penh midnight
  dayType: { type: String, enum: ['Working', 'Sunday', 'Holiday', 'SpecialWorking'], required: true },
  note:    { type: String, default: '' }
}, { timestamps: true });

workCalendarSchema.index({ company: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkCalendar', workCalendarSchema);
