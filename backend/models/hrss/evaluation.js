const mongoose = require('mongoose');
const evaluationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  step: { type: String, enum: ['Evaluate1', 'Evaluate2', 'Evaluate3'], required: true },
  date: { type: Date, required: true },
  reason: { type: String },
  evaluator: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Evaluation', evaluationSchema);
