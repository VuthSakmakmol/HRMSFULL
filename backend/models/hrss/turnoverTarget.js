const mongoose = require('mongoose')

const turnoverTargetSchema = new mongoose.Schema({
  company: { type: String, required: true },
  year: { type: Number, required: true },
  type: { type: String, required: true }, // e.g. 'DirectLabor', 'Indirect', etc.
  value: { type: Number, required: true } // e.g. 2.5 (%)
}, {
  timestamps: true
})

turnoverTargetSchema.index({ company: 1, year: 1, type: 1 }, { unique: true })

module.exports = mongoose.model('TurnoverTarget', turnoverTargetSchema)
