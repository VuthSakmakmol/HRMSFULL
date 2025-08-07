const mongoose = require('mongoose')

const AttendanceTargetSchema = new mongoose.Schema({
  company: { type: String },  year: { type: Number, required: true },
  type: { type: String, enum: ['AbsentRate'], required: true },
  value: { type: Number, default: 0 }
})

AttendanceTargetSchema.index({ company: 1, year: 1, type: 1 }, { unique: true })

module.exports = mongoose.model('AttendanceTarget', AttendanceTargetSchema)
