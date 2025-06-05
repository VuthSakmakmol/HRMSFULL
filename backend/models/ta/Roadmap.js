const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: String, required: true }, // e.g., 'Jan', 'Feb'
  type: { type: String, enum: ['White Collar', 'Blue Collar'], required: true },
  subType: { type: String, enum: ['Sewer', 'Non-Sewer'], default: null },
  roadmapHC: { type: Number, required: true },       // Forecast
  actualHC: { type: Number, required: true },        // Actual hired
  hiringTargetHC: { type: Number, required: true },   // Target to be filled
  company: {type: String, required: true}
});

module.exports = mongoose.model('Roadmap', roadmapSchema);
